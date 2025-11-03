//my_webgazer_test\src\components\CalibrationPoints.jsx
import React, { } from 'react';
import { CALIBRATION_POINT_IDS } from '../utils/constants.js'; 

/**
 * 用于渲染校准点的组件。
 * 逻辑为每次只显示一个活动点。
 *
 * @param {object} props - 组件的 props.
 * @param {boolean} props.show - 是否显示校准容器。
 * @param {function} props.onClick - 点击校准点时的回调函数。
 * @param {string | null} props.activePointId - 当前应该显示的点的 ID。
 */
function CalibrationPoints({ show, onClick, activePointId }) {
  const displayStyle = show ? {} : { display: 'none' };

  return (
    <div className="calibrationDiv" style={displayStyle}>
      {CALIBRATION_POINT_IDS.map((id) => {
        // 判断循环中的当前点是否是需要显示的活动点。
        const isVisible = id === activePointId;

        return (
          <input
            key={id}
            type="button"
            className="Calibration"
            id={id}
            style={{
              // 使用 'display' 属性来控制每个点的可见性。
              display: isVisible ? 'block' : 'none',
              // 背景色和透明度可以设为固定值，因为点击状态不再在此组件中跟踪。
              backgroundColor: 'blue',
              opacity: '1',
            }}
            // onClick 事件直接传递给父组件的处理器。
            onClick={(e) => onClick(e.target)}
          />
        );
      })}
    </div>
  );
}

export default CalibrationPoints;