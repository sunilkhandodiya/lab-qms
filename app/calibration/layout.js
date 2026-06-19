// app/calibration/layout.js — shared header + tabs for the Control & Calibration hub
import CalibTabs from './CalibTabs';

export default function CalibrationLayout({ children }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Control &amp; Calibration</div>
          <div className="page-subtitle">
            Calibration &amp; QC lot verification · Internal QC · CV% · EQAS · LIS · ILC · Inter-Personnel validation
          </div>
        </div>
      </div>
      <CalibTabs />
      {children}
    </div>
  );
}
