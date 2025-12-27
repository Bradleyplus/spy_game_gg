
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 应用挂载成功，清除 HTML 中的超时定时器
// @ts-ignore
if (window.loadTimer) {
  // @ts-ignore
  clearTimeout(window.loadTimer);
}
