
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log('Undercover: JS Execution Started');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Undercover: Root element missing!');
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('Undercover: Application mounted.');

  // 应用挂载成功，清除 HTML 中的超时定时器
  // @ts-ignore
  if (window.loadTimer) {
    // @ts-ignore
    clearTimeout(window.loadTimer);
    console.log('Undercover: Connection check passed.');
  }
} catch (err) {
  console.error('Undercover: Failed to mount application', err);
}
