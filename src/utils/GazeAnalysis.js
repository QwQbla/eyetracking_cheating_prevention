// src/utils/GazeAnalysis.js

// --- 全局参数配置 ---
export let GLOBAL_DISPERSION_THRESHOLD = 150; // P1: 离散度:区分眼跳和注视。
export let GLOBAL_MODIFIER_RATE = 0.08; // P3: 阅读置信度的衰减速度 
export let GLOBAL_CONFIDENCE_THRESHOLD = 0.55; // P4: 阅读置信度的及格线 
export const WINDOW_DURATION_MS = 150; // P2: 时间窗口:算法回顾历史的时长 

// 次要参数 (用于事件过滤和模式匹配)
export const FIXATION_MIN_DURATION_MS = 5; // P5: 滤除过短的扫视或抖动 
export const FIXATION_MAX_DURATION_MS = 10000; // P6: 过滤过长的注视 (如发呆、暂停) 
export const SACCADE_MIN_AMPLITUDE_PX = 5; // P7: 滤除微小的眼动 
export const SACCADE_MAX_AMPLITUDE_PX = 2000; // P8: 过滤过大的移动 

// 奖励值
export const FORWARD_BONUS = 0.4; // P9: 标准阅读奖励 
export const REGRESSION_BONUS = 0.3; // P10: 回读奖励 
export const WEAK_MATCH_BONUS = 0.15; // P11: 弱匹配奖励 

// --- L1/L2 辅助函数 ---
// 计算质心
export function calculateCentroid(points) {
  let sumX = 0, sumY = 0;
  for (const p of points) {
      sumX += p.x;
      sumY += p.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

// 计算幅度
export function calculateAmplitude(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// 计算方向
export function calculateDirection(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  if (angle > -22.5 && angle <= 22.5) return 'Right';
  if (angle > 22.5 && angle <= 67.5) return 'Right-Down';
  if (angle > 67.5 && angle <= 112.5) return 'Down';
  if (angle > 112.5 && angle <= 157.5) return 'Left-Down';
  if (angle > 157.5 || angle <= -157.5) return 'Left';
  if (angle > -157.5 && angle <= -112.5) return 'Left-Up';
  if (angle > -112.5 && angle <= -67.5) return 'Up';
  if (angle > -67.5 && angle <= -22.5) return 'Right-Up';
  return 'Unknown';
}

// --- L2: ReadingDetector 类 (模式识别器) ---
export class ReadingDetector {
  constructor() {
      this.eventHistory = [];
      this.MAX_HISTORY = 20;
      this.readingConfidence = 0.0;
    // --- 定时衰减器 ---
    // 每 500ms (0.5秒) 触发一次衰减
      this.decayTimer = setInterval(() => {
            // 获取当前的衰减力度 (全局变量)
            const decayRate = typeof GLOBAL_MODIFIER_RATE !== 'undefined' ? GLOBAL_MODIFIER_RATE : 0.1;

            this.decayConfidence(decayRate ); 

      }, 500); 
  }
  destroy() {//清除定时器
        if (this.decayTimer) clearInterval(this.decayTimer);
  }

  addEvent(event) {
      this.eventHistory.push(event);
      if (this.eventHistory.length > this.MAX_HISTORY) {
          this.eventHistory.shift();
      }

      // 仅在注视点形成时评估阅读模式
      if (event.type === 'Fixation') {
          this.evaluateReadingPattern();
      }

      // 返回判断结果 - 使用 GLOBAL_CONFIDENCE_THRESHOLD
      if (this.readingConfidence > GLOBAL_CONFIDENCE_THRESHOLD) {
          return { status: '疑似阅读', className: 'behaviorReading' };
      } else {
          return { status: '非阅读', className: 'behaviorBrowsing' };
      }
  }

  evaluateReadingPattern() {
      const lastFix = this.eventHistory[this.eventHistory.length - 1];
      const lastSac = this.eventHistory[this.eventHistory.length - 2];

      if (!lastFix || !lastSac || lastSac.type !== 'Saccade') {
           // 数据不全，什么都不做，等待定时器自然衰减
          //this.decayConfidence(GLOBAL_MODIFIER_RATE);
          return;
      }

      // 使用 GLOBAL_MODIFIER_RATE 作为基础衰减
      //this.decayConfidence(GLOBAL_MODIFIER_RATE);

      // 使用参数化的规则判断
      const rule1_Duration = lastFix.duration >= FIXATION_MIN_DURATION_MS && lastFix.duration <= FIXATION_MAX_DURATION_MS;
      const isRightward = ['Right', 'Right-Down', 'Right-Up'].includes(lastSac.direction);
      const isLeftward = ['Left', 'Left-Down', 'Left-Up'].includes(lastSac.direction);
      const isForwardAmplitude = lastSac.amplitude >= SACCADE_MIN_AMPLITUDE_PX && lastSac.amplitude <= SACCADE_MAX_AMPLITUDE_PX;
      const isRegressionAmplitude = lastSac.amplitude >= SACCADE_MIN_AMPLITUDE_PX && lastSac.amplitude <= SACCADE_MAX_AMPLITUDE_PX;

      console.log(`[ReadingDetector] 分析模式 - 注视: ${lastFix.duration.toFixed(0)}ms, 眼跳: ${lastSac.amplitude.toFixed(0)}px ${lastSac.direction}`);

      if (rule1_Duration && isRightward && isForwardAmplitude) {
          console.log(`[ReadingDetector] ✅ 检测到前向阅读模式 (+${FORWARD_BONUS})`);
          this.increaseConfidence(FORWARD_BONUS); // 前向阅读信号
      } else if (rule1_Duration && isLeftward && isRegressionAmplitude) {
          console.log(`[ReadingDetector] ✅ 检测到回读模式 (+${REGRESSION_BONUS})`);
          this.increaseConfidence(REGRESSION_BONUS);  // 回读信号
      } else if (isRightward && isForwardAmplitude) {
          console.log(`[ReadingDetector] ⚠️ 检测到弱阅读信号 (+${WEAK_MATCH_BONUS})`);
          this.increaseConfidence(WEAK_MATCH_BONUS);  // 弱信号
      } else {
          console.log('[ReadingDetector] ❌ 未检测到阅读模式');
      }
  }

  increaseConfidence(amount) {
      this.readingConfidence = Math.min(1.0, this.readingConfidence + amount);
  }
  decayConfidence(amount) {
      this.readingConfidence = Math.max(0.0, this.readingConfidence - amount);
  }
}