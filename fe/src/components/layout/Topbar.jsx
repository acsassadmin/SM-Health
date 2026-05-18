import React from 'react';
import { BRAND } from '../../utils/brand';

const Topbar = ({ title }) => {
  return (
    <div id="topbar">
      <div className="topbar-left">
        <h1 id="page-title">{title}</h1>
        <div className="breadcrumb" id="page-crumb">{BRAND.name} · {title}</div>
      </div>
      <div className="topbar-right">
        <span style={{fontSize:'12px', color:'var(--muted)'}}>📍 {BRAND.location}</span>
        <button className="topbar-btn">+ Create Shift</button>
      </div>
    </div>
  );
};

export default Topbar;