// src/utils/GazeAnalysis.js

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

      // 返回判断结果
      if (this.readingConfidence > 0.25) {
          return { status: '阅读 (Reading)', className: 'behaviorReading' };
      } else {
          return { status: '非阅读 (Browsing)', className: 'behaviorBrowsing' };
      }
  }

  evaluateReadingPattern() {
      const lastFix = this.eventHistory[this.eventHistory.length - 1];
      const lastSac = this.eventHistory[this.eventHistory.length - 2];

      if (!lastFix || !lastSac || lastSac.type !== 'Saccade') {
          console.log('[ReadingDetector] 事件序列不符合要求，置信度衰减');
          this.decayConfidence(0.1);
          return;
      }

      this.decayConfidence(0.1); // 基础衰减

      // 宽松的规则判断
      const rule1_Duration = lastFix.duration > 100 && lastFix.duration < 600;
      const isRightward = ['Right', 'Right-Down', 'Right-Up'].includes(lastSac.direction);
      const isLeftward = ['Left', 'Left-Down', 'Left-Up'].includes(lastSac.direction);
      const isForwardAmplitude = lastSac.amplitude > 30 && lastSac.amplitude < 450;
      const isRegressionAmplitude = lastSac.amplitude > 10 && lastSac.amplitude < 250;

      console.log(`[ReadingDetector] 分析模式 - 注视: ${lastFix.duration.toFixed(0)}ms, 眼跳: ${lastSac.amplitude.toFixed(0)}px ${lastSac.direction}`);

      if (rule1_Duration && isRightward && isForwardAmplitude) {
          console.log('[ReadingDetector] ✅ 检测到前向阅读模式 (+0.35)');
          this.increaseConfidence(0.35); // 前向阅读信号
      } else if (rule1_Duration && isLeftward && isRegressionAmplitude) {
          console.log('[ReadingDetector] ✅ 检测到回读模式 (+0.2)');
          this.increaseConfidence(0.2);  // 回读信号
      } else if (isRightward && isForwardAmplitude) {
          console.log('[ReadingDetector] ⚠️ 检测到弱阅读信号 (+0.1)');
          this.increaseConfidence(0.1);  // 弱信号
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