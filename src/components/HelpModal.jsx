// components/HelpModal.jsx

import React from 'react';
// 1. 从 react-bootstrap 导入 Modal 和 Button 组件
import { Modal, Button } from 'react-bootstrap';
import '../styles/HelpModal.css'; // 样式可以继续沿用

// 2. props 名称根据 react-bootstrap 的习惯进行了调整 (open -> show, onClose -> onHide)
function HelpModal({ show, onHide, onCalibrateClick }) {


  //console.log('子组件接收到的 prop - show:', show);
  const handleCalibrateClick = () => {
    //console.log("1. '开始校准' 按钮被点击 (在 HelpModal 中)"); 
    //console.log("2. 准备调用 onHide 来关闭窗口..."); 
    onHide();  
    //console.log("3. 准备调用 onCalibrateClick 来开始校准..."); 
    onCalibrateClick();
  };

  return (
    // 3. 使用 react-bootstrap 的 Modal 组件
    <Modal
      show={show} // 控制是否显示
      onHide={onHide} // 点击遮罩层、右上角关闭按钮或按 ESC 时的回调
      aria-labelledby="help-modal-title"
      dialogClassName="modal-90w"
      centered // 垂直居中
    >
      <Modal.Header closeButton>
        <Modal.Title id="help-modal-title">
          欢迎使用眼动面试平台!
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body-scrollable">
        <p className="lead mb-4">
          为了给您带来正确的阅读体验，请花一分钟完成以下简单设置。
        </p>

        <div className="step-card">
          <h4>注意事项</h4>
          <ul>
            <li>我们的核心功能依赖前置摄像头来捕捉眼部活动。当浏览器弹出请求时，请点击<strong>“允许”</strong>。</li>
            <li>请确保您处于一个光线充足、均匀的环境中，避免背光或面部出现强烈阴影。</li>
            <li>我们承诺，摄像头仅用于分析眼动数据，不会录制、存储或上传任何视频画面。</li>
            <li>请您尽量保持头部平稳，避免大幅度晃动，让您的面部保持在画面中央。</li>
          </ul>
        </div>

      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          关闭
        </Button>
        <Button variant="primary" onClick={handleCalibrateClick}>
          开始校准
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default HelpModal;