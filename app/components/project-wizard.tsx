'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Layout, Folder, Sparkles, ChevronRight, ChevronLeft, 
  Cpu, Box, Code2, Database, Globe, Check, Zap, Server,
  HelpCircle, HardDrive, Terminal, FileCode, Monitor, Share2, AppWindow,
  Beaker, Layers, Package
} from 'lucide-react';

// Restauración de Logos vectoriales proporcionados
const TechLogo = ({ name, className, color }: { name: string, className?: string, color?: string }) => {
  const props = { className, fill: color || 'currentColor' };
  switch (name) {
    case 'JS': return <svg viewBox="0 0 630 630" {...props}><path d="m0 0h630v630h-630z" fill="#f7df1e"/><path d="m423.2 492.19c12.69 20.72 29.2 35.95 58.4 35.95 24.53 0 40.2-12.26 40.2-29.2 0-20.3-16.1-27.49-43.1-34.3l-14.8-3.8c-44-10.2-72.3-30.5-72.3-78.2 0-42.7 31.3-73.6 78.7-73.6 34.3 0 61.7 11.84 81.2 48.2l-42.3 27.1c-12.3-21.6-22.8-28.3-38.9-28.3-15.2 0-24.5 7.61-24.5 19.45 0 14.4 9.3 20.7 31.3 26.2l14.8 3.4c47.4 11.4 83.7 31.7 83.7 80.3 0 50.8-37.2 81.6-93.1 81.6-53.7 0-82.1-26.2-97.8-54.1zm-226.3-5.1c15.2 25.4 36.4 41 67.7 41 24.5 0 43.1-11.8 43.1-53.7v-164.1h52.9v164.1c0 71.5-41.5 93.1-95.2 93.1-52.5 0-88-25.8-103.6-54.1z" fill="#000"/></svg>;
    case 'TS': return <svg viewBox="0 0 128 128" {...props}><path d="M1.5 128V0h125v128H1.5z" fill="#3178c6"/><path d="M118.7 104.2c-.2.2-.4.4-.7.6-1.1.8-2.3 1.5-3.6 2.1-1.3.6-2.7 1.1-4.1 1.5-1.4.4-2.9.7-4.5.9-1.5.2-3.1.3-4.8.3-2.4 0-4.7-.2-6.8-.7-2.1-.5-4-1.2-5.7-2.1-1.7-.9-3.1-2.1-4.2-3.5-1.1-1.4-1.7-3.1-1.7-5.1 0-1.8.5-3.3 1.4-4.6.9-1.3 2.1-2.4 3.5-3.2 1.4-.8 3-1.4 4.8-1.8 1.8-.4 3.5-.6 5.3-.6 1.3 0 2.6.1 3.8.3 1.2.2 2.4.5 3.5.8 1.1.3 2.1.8 3.1 1.2.9.5 1.8 1 2.5 1.6V104.2zM63.4 25.9v11.1H48.2v76.8H35.9V37h-15.2V25.9h42.7z" fill="#fff"/></svg>;
    case 'Python': return <svg viewBox="0 0 448 512" {...props}><path d="M439.8 200.5c-7.7-30.9-22.3-54.2-53.4-54.2h-40.1v47.4c0 36.8-31.2 67.8-66.8 67.8H172.7c-29.2 0-53.4 25-53.4 54.3v101.7c0 29 25.2 46 53.4 54.3 33.8 9.9 66.3 11.7 106.8 0 26.9-7.8 53.4-23.5 53.4-54.3v-40.7H226.2v-13.6h160.2c31.1 0 42.6-21.7 53.4-54.2 11.2-33.5 10.7-65.7 0-108.6zM286.2 404c-11.1 0-20.1-9-20.1-20.1s9-20.1 20.1-20.1 20.1 9 20.1 20.1-9 20.1-20.1 20.1zM46.9 312.2c7.7 31 22.2 54.2 53.4 54.2h40.1v-47.4c0-36.8 31.3-67.8 66.8-67.8h106.8c29.2 0 53.4-25 53.4-54.3V95.2c0-29-25.2-46-53.4-54.3-33.8-9.9-66.3-11.7-106.8 0-26.9 7.8-53.4 23.5-53.4 54.3v40.7h106.8v13.6H53.4c-31.1 0-42.6 21.7-53.4 54.2-11.2 33.5-10.7 65.7 0 108.6zM161.8 108c11.1 0 20.1 9 20.1 20.1s-9 20.1-20.1 20.1-20.1-9-20.1-20.1 9-20.1 20.1-20.1z"/></svg>;
    case 'PHP': return <svg viewBox="0 0 640 512" {...props}><path d="M624 448H16c-8.8 0-16-7.2-16-16V80c0-8.8 7.2-16 16-16h608c8.8 0 16 7.2 16 16v352c0 8.8-7.2 16-16 16zM312.4 249.7c0 33.7-26.3 61.1-58.7 61.1H195v52.8h-41.4V148.4h100.1c32.4 0 58.7 27.4 58.7 61.1v40.2zm-58.7-1.1c11.1 0 20.1-9.4 20.1-21v-38.1c0-11.6-9-21-20.1-21H195v80.1h58.7zm237.7 1.1c0 33.7-26.3 61.1-58.7 61.1H374v52.8h-41.4V148.4h100.1c32.4 0 58.7 27.4 58.7 61.1v40.2zm-58.7-1.1c11.1 0 20.1-9.4 20.1-21v-38.1c0-11.6-9-21-20.1-21H374v80.1h58.7z"/></svg>;
    case 'Node.js':
      return (
        <svg viewBox="0 0 256 292" className={className}>
          <defs>
            <linearGradient x1="68.1884411%" y1="17.4868311%" x2="27.8226935%" y2="89.7551419%" id="gn1">
              <stop stopColor="#41873F" offset="0%"/><stop stopColor="#418B3D" offset="32.88%"/><stop stopColor="#419637" offset="63.52%"/><stop stopColor="#3FA92D" offset="93.19%"/><stop stopColor="#3FAE2A" offset="100%"/>
            </linearGradient>
            <linearGradient x1="43.2765472%" y1="55.168777%" x2="159.245277%" y2="-18.3061379%" id="gn2">
              <stop stopColor="#41873F" offset="13.76%"/><stop stopColor="#54A044" offset="40.32%"/><stop stopColor="#66B848" offset="71.36%"/><stop stopColor="#6CC04A" offset="90.81%"/>
            </linearGradient>
            <linearGradient x1="-4.38880435%" y1="49.9972065%" x2="101.499239%" y2="49.9972065%" id="gn3">
              <stop stopColor="#6CC04A" offset="9.191646%"/><stop stopColor="#66B848" offset="28.64%"/><stop stopColor="#54A044" offset="59.68%"/><stop stopColor="#41873F" offset="86.24%"/>
            </linearGradient>
            <path d="M134.922587,1.83244962 C130.579003,-0.610816541 125.420997,-0.610816541 121.077412,1.83244962 L6.78685046,67.8006362 C2.44326617,70.2439024 0,74.8589606 0,79.745493 L0,211.95334 C0,216.839873 2.71474019,221.454931 6.78685046,223.898197 L121.077412,289.866385 C125.420997,292.309649 130.579003,292.309649 134.922587,289.866385 L249.213148,223.898197 C253.556733,221.454931 256,216.839873 256,211.95334 L256,79.745493 C256,74.8589606 253.28526,70.2439024 249.213148,67.8006362 L134.922587,1.83244962 L134.922587,1.83244962 Z" id="pn1"/>
            <path d="M134.922587,1.83244962 C130.579003,-0.610816541 125.420997,-0.610816541 121.077412,1.83244962 L6.78685046,67.8006362 C2.44326617,70.2439024 0,74.8589606 0,79.745493 L0,211.95334 C0,216.839873 2.71474019,221.454931 6.78685046,223.898197 L121.077412,289.866385 C125.420997,292.309649 130.579003,292.309649 134.922587,289.866385 L249.213148,223.898197 C253.556733,221.454931 256,216.839873 256,211.95334 L256,79.745493 C256,74.8589606 253.28526,70.2439024 249.213148,67.8006362 L134.922587,1.83244962 L134.922587,1.83244962 Z" id="pn2"/>
          </defs>
          <g>
            <path d="M134.922587,1.83244962 C130.579003,-0.610816541 125.420997,-0.610816541 121.077412,1.83244962 L6.78685046,67.8006362 C2.44326617,70.2439024 0,74.8589606 0,79.745493 L0,211.95334 C0,216.839873 2.71474019,221.454931 6.78685046,223.898197 L121.077412,289.866385 C125.420997,292.309649 130.579003,292.309649 134.922587,289.866385 L249.213148,223.898197 C253.556733,221.454931 256,216.839873 256,211.95334 L256,79.745493 C256,74.8589606 253.28526,70.2439024 249.213148,67.8006362 L134.922587,1.83244962 L134.922587,1.83244962 Z" fill="url(#gn1)"/>
            <mask id="m1" fill="white"><use xlinkHref="#pn1"/></mask>
            <path d="M249.484623,67.8006362 L134.651113,1.83244962 C133.565217,1.28950159 132.207847,0.746553555 131.121951,0.475079538 L2.44326617,220.911983 C3.52916224,222.269353 4.88653235,223.355249 6.24390243,224.169671 L121.077412,290.137857 C124.335101,292.038177 128.135737,292.581124 131.664899,291.495227 L252.470838,70.5153764 C251.656416,69.4294803 250.570518,68.6150581 249.484623,67.8006362 L249.484623,67.8006362 Z" fill="url(#gn2)" mask="url(#m1)"/>
            <mask id="m2" fill="white"><use xlinkHref="#pn2"/></mask>
            <path d="M249.756098,223.898195 C253.013785,221.997878 255.457053,218.740191 256.542947,215.211029 L130.579003,0.203604793 C127.321315,-0.339343381 123.792153,-0.0678694115 120.805938,1.83244885 L6.78685046,67.5291613 L129.764581,291.766702 C131.393425,291.495227 133.293743,290.952279 134.922587,290.137857 L249.756098,223.898195 L249.756098,223.898195 Z" fill="url(#gn3)" mask="url(#m2)"/>
          </g>
        </svg>
      );
    case 'Bun': return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className}><path d="M113.744 41.999a18.558 18.558 0 0 0-.8-.772c-.272-.246-.528-.524-.8-.771s-.528-.525-.8-.771c-.272-.247-.528-.525-.8-.772s-.528-.524-.8-.771-.528-.525-.8-.772-.528-.524-.8-.771c7.936 7.52 12.483 17.752 12.656 28.481 0 25.565-26.912 46.363-60 46.363-18.528 0-35.104-6.526-46.128-16.756l.8.772.8.771.8.772.8.771.8.772.8.771.8.771c11.008 10.662 27.952 17.527 46.928 17.527 33.088 0 60-20.797 60-46.285 0-10.893-4.864-21.215-13.456-29.33z"/><path fill="#fbf0df" d="M116.8 65.08c0 23.467-25.072 42.49-56 42.49s-56-19.023-56-42.49c0-14.55 9.6-27.401 24.352-35.023C43.904 22.435 53.088 14.628 60.8 14.628S75.104 21 92.448 30.058C107.2 37.677 116.8 50.53 116.8 65.08Z"/><path fill="#f6dece" d="M116.8 65.08a32.314 32.314 0 0 0-1.28-8.918c-4.368 51.377-69.36 53.846-94.912 38.48 11.486 8.584 25.66 13.144 40.192 12.928 30.88 0 56-19.054 56-42.49z"/><path fill="#fffefc" d="M39.248 27.234c7.152-4.135 16.656-11.896 26-11.911a15.372 15.372 0 0 0-4.448-.695c-3.872 0-8 1.93-13.2 4.83-1.808 1.018-3.68 2.144-5.664 3.317-3.728 2.222-8 4.736-12.8 7.251C13.904 37.972 4.8 51.071 4.8 65.08v1.836c9.696-33.033 27.312-35.547 34.448-39.682z"/><path fill="#ccbea7" d="M56.192 18.532A24.553 24.553 0 0 1 53.867 29.1a25.407 25.407 0 0 1-6.683 8.671c-.448.386-.096 1.127.48.91 5.392-2.02 12.672-8.068 9.6-20.272-.128-.695-1.072-.51-1.072.123zm3.632 0a24.474 24.474 0 0 1 3.646 10.12c.445 3.587.08 7.224-1.07 10.662-.192.54.496 1.003.88.556 3.504-4.32 6.56-12.899-2.592-22.156-.464-.4-1.184.216-.864.756zm4.416-.262a25.702 25.702 0 0 1 7.521 7.925A24.71 24.71 0 0 1 75.2 36.414c-.016.13.02.26.101.365a.543.543 0 0 0 .718.117.509.509 0 0 0 .221-.313c1.472-5.384.64-14.564-11.472-19.332-.64-.246-1.056.587-.528.957zM34.704 34.315a27.418 27.418 0 0 0 9.91-5.222 26.262 26.262 0 0 0 6.842-8.663c.288-.556 1.2-.34 1.056.277-2.768 12.343-12.032 14.92-17.792 14.58-.608.016-.592-.802-.016-.972z"/><path d="M60.8 111.443c-33.088 0-60-20.798-60-46.363 0-15.429 9.888-29.823 26.448-38.448 4.8-2.469 8.912-4.953 12.576-7.128 2.016-1.203 3.92-2.33 5.76-3.379C51.2 12.916 56 10.771 60.8 10.771c4.8 0 8.992 1.852 14.24 4.845 1.6.88 3.2 1.836 4.912 2.885 3.984 2.376 8.48 5.06 14.4 8.131 16.56 8.625 26.448 23.004 26.448 38.448 0 25.565-26.912 46.363-60 46.363zm0-96.814c-3.872 0-8 1.928-13.2 4.829-1.808 1.018-3.68 2.144-5.664 3.317-3.728 2.222-8 4.736-12.8 7.251C13.904 37.972 4.8 51.071 4.8 65.08c0 23.436 25.12 42.506 56 42.506s56-19.07 56-42.506c0-14.01-9.104-27.108-24.352-35.023-6.048-3.086-10.768-5.986-14.592-8.27-1.744-1.033-3.344-1.99-4.8-2.838-4.848-2.778-8.384-4.32-12.256-4.32z"/><path fill="#b71422" d="M72.08 76.343c-.719 2.839-2.355 5.383-4.672 7.267a11.07 11.07 0 0 1-6.4 2.9 11.13 11.13 0 0 1-6.608-2.9c-2.293-1.892-3.906-4.436-4.608-7.267a1.073 1.073 0 0 1 .05-.5 1.11 1.11 0 0 1 .272-.428 1.19 1.19 0 0 1 .958-.322h19.744a1.185 1.185 0 0 1 .947.33 1.073 1.073 0 0 1 .317.92z"/><path fill="#ff6164" d="M54.4 83.733a11.24 11.24 0 0 0 6.592 2.932 11.239 11.239 0 0 0 6.576-2.932 16.652 16.652 0 0 0 1.6-1.65 10.904 10.904 0 0 0-3.538-2.564 11.26 11.26 0 0 0-4.302-1 10.121 10.121 0 0 0-4.549 1.192 9.71 9.71 0 0 0-3.451 3.097c.368.323.688.632 1.072.925z"/><path d="M54.656 82.514a8.518 8.518 0 0 1 2.97-2.347 8.836 8.836 0 0 1 3.734-.862 9.78 9.78 0 0 1 6.4 2.608c.368-.386.72-.787 1.056-1.188-2.035-1.87-4.726-2.933-7.536-2.978a10.487 10.487 0 0 0-4.335.975 10.125 10.125 0 0 0-3.489 2.666c.378.396.779.772 1.2 1.126z"/><path d="M60.944 87.436a12.078 12.078 0 0 1-7.12-3.086c-2.477-2.02-4.22-4.75-4.976-7.791-.054-.27-.045-.55.027-.817a1.83 1.83 0 0 1 .389-.726 2.25 2.25 0 0 1 .81-.595 2.32 2.32 0 0 1 .998-.192h19.744c.343-.007.683.06.996.196a2.3 2.3 0 0 1 .812.591c.182.212.313.46.382.728.07.267.076.545.018.815-.756 3.042-2.5 5.771-4.976 7.791a12.078 12.078 0 0 1-7.104 3.086zm-9.872-11.417c-.256 0-.32.108-.336.139.676 2.638 2.206 4.999 4.368 6.742a10.122 10.122 0 0 0 5.84 2.7 10.207 10.207 0 0 0 5.84-2.67c2.155-1.745 3.679-4.106 4.352-6.741a.333.333 0 0 0-.14-.113.348.348 0 0 0-.18-.026z"/><path fill="#febbd0" d="M85.152 77.3c5.17 0 9.36-2.377 9.36-5.308s-4.19-5.307-9.36-5.307c-5.17 0-9.36 2.376-9.36 5.307 0 2.931 4.19 5.307 9.36 5.307zm-48.432 0c5.17 0 9.36-2.377 9.36-5.308s-4.19-5.307-9.36-5.307c-5.17 0-9.36 2.376-9.36 5.307 0 2.931 4.19 5.307 9.36 5.307z"/><path d="M41.12 69.863a9.052 9.052 0 0 0 4.902-1.425 8.578 8.578 0 0 0 3.254-3.812 8.22 8.22 0 0 0 .508-4.913 8.41 8.41 0 0 0-2.408-4.357 8.92 8.92 0 0 0-4.514-2.33 9.12 9.12 0 0 0-5.096.48 8.755 8.755 0 0 0-3.96 3.131 8.287 8.287 0 0 0-1.486 4.725c0 2.252.927 4.412 2.577 6.005 1.65 1.594 3.888 2.492 6.223 2.496zm39.632 0a9.054 9.054 0 0 0 4.915-1.403 8.582 8.582 0 0 0 3.275-3.802 8.22 8.22 0 0 0 .528-4.917 8.408 8.408 0 0 0-2.398-4.368 8.92 8.92 0 0 0-4.512-2.344 9.12 9.12 0 0 0-5.103.473 8.756 8.756 0 0 0-3.967 3.13 8.287 8.287 0 0 0-1.49 4.73c-.004 2.245.914 4.4 2.555 5.994 1.64 1.593 3.869 2.495 6.197 2.507z"/><path fill="#fff" d="M38.4 61.902a3.4 3.4 0 0 0 1.844-.531c.547-.35.974-.847 1.227-1.43a3.088 3.088 0 0 0 .195-1.847 3.16 3.16 0 0 0-.902-1.639 3.351 3.351 0 0 0-1.696-.878 3.426 3.426 0 0 0-1.916.179 3.29 3.29 0 0 0-1.489 1.176 3.113 3.113 0 0 0-.559 1.776c0 .844.347 1.654.964 2.253a3.374 3.374 0 0 0 2.332.94zm39.632 0a3.4 3.4 0 0 0 1.844-.531c.547-.35.974-.847 1.227-1.43a3.088 3.088 0 0 0 .195-1.847 3.16 3.16 0 0 0-.902-1.639 3.351 3.351 0 0 0-1.696-.878 3.426 3.426 0 0 0-1.916.179 3.29 3.29 0 0 0-1.489 1.176 3.113 3.113 0 0 0-.559 1.776c0 .84.342 1.644.953 2.242.61.598 1.44.94 2.311.952z"/></svg>;
    case 'Deno': return <svg viewBox="0 0 122.87 122.88" className={className}><g><path fill="#222" d="M56.6,0.03c-0.29,0.03-1.21,0.14-2.04,0.21C42.74,1.48,31.11,6.48,21.62,14.43c-1.75,1.45-5.74,5.44-7.19,7.19 C6.57,31.01,1.98,41.54,0.28,54.01c-0.38,2.77-0.38,12.1,0,14.87c1.69,12.47,6.29,23,14.14,32.38c1.45,1.75,5.44,5.74,7.19,7.19 C31,116.31,41.54,120.9,54,122.6c2.77,0.38,12.1,0.38,14.87,0c12.47-1.69,23-6.29,32.38-14.14c1.75-1.45,5.74-5.44,7.19-7.19 c7.86-9.38,12.45-19.92,14.14-32.38c0.38-2.77,0.38-12.1,0-14.87c-1.69-12.47-6.29-23-14.14-32.38c-1.45-1.75-5.44-5.74-7.19-7.19 C91.9,6.6,81.26,1.95,68.96,0.3c-1.33-0.18-3.26-0.26-6.85-0.29C59.38-0.01,56.89,0,56.6,0.03L56.6,0.03z M57.36,6.56 c0,1.77,0.12,5.61,0.29,9.25c0.09,1.78,0.2,4.34,0.24,5.67c0.17,4.71,0.67,17.09,0.74,18.19l0.08,1.1l-0.68-0.08 c-0.38-0.03-0.73-0.12-0.79-0.17c-0.05-0.06-0.15-1.1-0.21-2.33c-0.27-5.38-1.16-26.25-1.25-29.3l-0.09-3.35l0.42-0.06 c0.23-0.03,0.6-0.08,0.85-0.09l0.41-0.01L57.36,6.56L57.36,6.56L57.36,6.56z M71.82,6.2c0.02,0.02,0.06,4.58,0.11,10.14 c0.06,5.58,0.14,10.58,0.18,11.12c0.05,0.56,0.03,1.04-0.05,1.07c-0.06,0.05-0.44,0.05-0.82,0l-0.7-0.06l-0.11-4.4 c-0.06-2.43-0.14-5.12-0.17-6c-0.12-2.67-0.23-11.76-0.14-11.98C70.2,5.93,70.37,5.91,71,6.02C71.44,6.11,71.8,6.18,71.82,6.2 L71.82,6.2L71.82,6.2z M36.87,11.26c0.09,0.14,0.8,8.46,1.68,19.36c0.29,3.7,0.57,7.09,0.62,7.51c0.08,0.77,0.06,0.8-0.42,1.1 c-0.27,0.17-0.54,0.3-0.6,0.3c-0.05,0-0.14-0.39-0.18-0.88c-0.21-1.96-1.03-11.45-1.6-18.31c-0.33-4.03-0.63-7.65-0.68-8.04 c-0.08-0.67-0.06-0.73,0.33-0.94C36.49,11.11,36.76,11.06,36.87,11.26L36.87,11.26L36.87,11.26z M78.47,14.3 c0.42,0.15,0.47,0.23,0.56,1.09c0.15,1.51,0.11,8.73-0.06,8.73c-0.44,0-1.35-0.51-1.42-0.8c-0.05-0.18-0.09-2.33-0.09-4.76 C77.45,13.65,77.39,13.93,78.47,14.3L78.47,14.3z M50.56,15.01c0,0.41,0.11,2.66,0.23,5.03c0.12,2.37,0.26,5.38,0.32,6.68 c0.11,2.63,0.14,2.54-0.88,2.6c-0.5,0.02-0.5,0.02-0.53-0.74c-0.03-0.42-0.11-1.74-0.2-2.95c-0.08-1.21-0.26-3.82-0.38-5.82 c-0.12-1.99-0.27-3.97-0.32-4.4c-0.09-0.76-0.08-0.79,0.33-0.94c0.24-0.09,0.67-0.17,0.94-0.17C50.56,14.3,50.56,14.3,50.56,15.01 L50.56,15.01L50.56,15.01z M92.47,17.08l0.51,0.21l0.11,2.02c0.05,1.1,0.08,3.49,0.05,5.29l-0.05,3.29l-0.63-0.32l-0.63-0.3 l-0.05-5.02c-0.03-2.77-0.02-5.11,0.02-5.21C91.85,16.82,91.85,16.82,92.47,17.08L92.47,17.08L92.47,17.08z M64.88,19.06 c0.09,0.09,0.3,7.42,0.32,11.14l0.02,2.24l-0.71-0.11c-0.41-0.05-0.74-0.09-0.76-0.11c-0.05-0.03-0.5-11.23-0.5-12.32v-1.12 l0.77,0.09C64.46,18.94,64.84,19.01,64.88,19.06L64.88,19.06L64.88,19.06z M99.68,20.13c0.18,0.21,0.21,3.52,0.26,21.77 c0.05,20.96,0.05,21.5-0.23,21.5c-0.17,0-0.39-0.09-0.53-0.2c-0.23-0.17-0.26-1.99-0.33-19.9c-0.06-10.85-0.14-20.7-0.18-21.9 l-0.09-2.18l0.44,0.32C99.27,19.74,99.56,19.99,99.68,20.13L99.68,20.13L99.68,20.13z M86.13,23.23c0.08,0.06,0.15,0.92,0.17,1.9 c0.08,3.34,0.09,23.81,0.02,23.88c-0.03,0.03-0.3-0.05-0.6-0.17l-0.54-0.23l0-25.7L85.58,23C85.81,23.06,86.05,23.15,86.13,23.23 L86.13,23.23L86.13,23.23z M44.42,24.07c0.05,0.41,0.12,1.33,0.17,2.09c0.05,0.74,0.15,2.43,0.24,3.75 c0.18,2.66,0.15,2.83-0.71,2.83c-0.45,0-0.51-0.05-0.57-0.5c-0.15-0.89-0.68-8.33-0.6-8.45c0.08-0.11,0.86-0.38,1.22-0.41 C44.26,23.36,44.38,23.68,44.42,24.07L44.42,24.07z M19.43,27.93c0.17,1.6,0.5,4.96,0.74,7.45c0.26,2.49,0.47,4.61,0.47,4.7 c0,0.18-1.16,0.76-1.28,0.63c-0.08-0.08-1.59-13.45-1.59-14.05c0-0.36,1.16-1.89,1.31-1.72C19.13,24.96,19.28,26.31,19.43,27.93 L19.43,27.93z M78.68,29.51l0.44,0.26l0.02,3.26c0.01,1.78,0.05,3.78,0.05,4.43c0.03,1.36-0.14,1.59-0.95,1.3l-0.47-0.17v-1.3 c0-0.73-0.05-2.83-0.11-4.68l-0.09-3.35h0.35C78.09,29.26,78.44,29.38,78.68,29.51L78.68,29.51L78.68,29.51z M26.06,35.38 c0.27,2.9,0.71,7.8,1,10.88l0.51,5.59l-0.59,0.59l-0.57,0.59l-0.11-1.19c-0.06-0.67-0.36-3.75-0.68-6.86 c-0.32-3.11-0.77-7.63-1-10.03l-0.42-4.35l0.59-0.54c0.53-0.5,0.59-0.51,0.7-0.24C25.55,29.95,25.81,32.46,26.06,35.38L26.06,35.38 L26.06,35.38z M14.74,37.2c0.33,2.98,1.21,10.89,1.96,17.59c0.76,6.69,1.47,13.15,1.6,14.36c0.12,1.21,0.33,3.04,0.45,4.08 c0.21,1.77,0.21,1.89-0.03,2.07c-0.36,0.27-0.51,0.24-0.51-0.08c0-0.14-0.14-1.28-0.3-2.52c-0.27-2.07-0.73-5.58-1.74-13.45 c-0.21-1.59-0.62-4.74-0.91-7.03c-0.3-2.28-0.74-5.68-0.98-7.56c-0.24-1.87-0.65-5.08-0.91-7.15c-0.27-2.05-0.44-3.88-0.39-4.08 c0.11-0.41,1-1.83,1.09-1.74C14.11,31.75,14.41,34.21,14.74,37.2L14.74,37.2L14.74,37.2z M10.12,43.72 c0.23,1.81,0.65,5.12,0.94,7.37c0.29,2.24,0.65,5.03,0.82,6.2l0.29,2.12l-0.32,0.27c-0.18,0.15-0.36,0.21-0.42,0.15 c-0.06-0.06-0.18-0.67-0.27-1.33c-0.09-0.67-0.65-4.55-1.25-8.61l-1.07-7.4l0.35-1.03c0.18-0.56,0.38-1.01,0.42-1.01 C9.65,40.44,9.88,41.92,10.12,43.72L10.12,43.72L10.12,43.72z M93.08,41.74c0.21,0.21,0.24,1.15,0.24,8.08v7.84H92.9 c-0.92,0-0.91,0.23-0.97-8.36l-0.05-7.81h0.48C92.63,41.5,92.96,41.6,93.08,41.74L93.08,41.74z M60,44.44 c3.41,0.51,6.39,1.47,9.34,2.98c1.9,0.98,2.81,1.66,4.93,3.69c3.14,3.01,5.08,5.64,6.89,9.35c2.64,5.41,3.67,10.2,4.97,23.04 c0.59,5.76,1.36,16.2,1.53,20.48c0.05,1.24,0.15,3.28,0.24,4.53c0.17,2.66,0.36,2.3-1.98,3.43c-3.25,1.57-6.38,2.66-10.5,3.67 c-5.05,1.24-8.31,1.63-13.3,1.65l-3.63,0.01l0.03-1.74c0-0.95,0.09-3.17,0.18-4.91c0.45-8.42,0.36-19.04-0.23-24.93 c-0.33-3.38-0.98-7.49-1.35-8.4c-0.08-0.2,0.27-0.36,1.77-0.88c2.74-0.95,5.11-2.15,5.47-2.73c0.65-1.12-0.51-2.72-1.99-2.72 c-0.26,0-1.03,0.27-1.74,0.59c-3.39,1.56-10.17,3.39-14.08,3.79c-2.7,0.29-6.91,0.12-9.82-0.41c-1.59-0.29-4.43-1.36-6.8-2.58 c-2.73-1.42-4.41-3.31-4.91-5.55c-0.27-1.21-0.2-3.63,0.15-4.99c0.38-1.5,1.44-3.67,2.4-4.94c4.31-5.67,13.19-10.58,22.3-12.3 C52.78,44.03,56.89,43.97,60,44.44L60,44.44L60,44.44z M106.62,44.91c0.54,0.23,0.6,0.29,0.6,0.8c0.03,4.13-0.06,13.55-0.14,13.95 c-0.02,0.14-0.8,0.15-1.13,0.03c-0.21-0.08-0.24-0.89-0.24-7.56c0-4.77,0.06-7.46,0.15-7.46 C105.94,44.67,106.29,44.77,106.62,44.91L106.62,44.91z M113.22,53.21l0.54,0.23l-0.11,12.51c-0.12,15.94-0.14,16.41-0.71,17.79 c-0.94,2.25-0.89,2.7-0.8-7.18c0.03-4.94,0.11-9.94,0.14-11.11c0.03-1.16,0.06-4.44,0.08-7.3c0-3.45,0.05-5.17,0.15-5.17 C112.6,52.98,112.92,53.09,113.22,53.21L113.22,53.21z M22.34,56.97c0.09,1.22,0.06,1.35-0.38,2.31l-0.48,1.03L21.3,58.8 c-0.29-2.42-0.29-2.52,0.29-2.89c0.26-0.18,0.53-0.3,0.57-0.27C22.21,55.67,22.3,56.27,22.34,56.97L22.34,56.97z M13.01,66.08 c0.14,1.24,1.19,9.46,1.74,13.49c0.82,6.24,0.88,7.13,0.51,6.75c-0.05-0.05-0.39-2.15-0.76-4.67c-2.36-16.29-2.34-16.18-2.15-16.3 C12.76,65.08,12.9,65.23,13.01,66.08L13.01,66.08L13.01,66.08z M23.89,73c0.09,0.38,0.53,4.47,0.53,4.97 c0,0.42-0.54,0.82-0.79,0.57c-0.08-0.08-0.27-1.36-0.42-2.84c-0.17-1.5-0.33-3.05-0.38-3.46l-0.09-0.76l0.53,0.6 C23.57,72.43,23.84,72.84,23.89,73L23.89,73L23.89,73z M36.08,78.7c0.17,0.15,0.27,0.76,0.41,2.39c0.23,2.95,0.26,2.72-0.36,2.72 c-0.63,0-0.62,0.05-0.83-2.61c-0.21-2.7-0.21-2.67,0.2-2.67C35.69,78.52,35.94,78.61,36.08,78.7L36.08,78.7z M48.05,78.93 c0.03,0.15,0.11,1.06,0.17,2.01c0.05,0.95,0.18,3.1,0.3,4.76c0.42,6.1,0.44,6.88,0.18,6.88c-0.29,0-0.32-0.23-0.65-4.53 c-0.12-1.78-0.35-4.59-0.5-6.24c-0.14-1.65-0.23-3.02-0.18-3.05C47.54,78.56,47.97,78.7,48.05,78.93L48.05,78.93L48.05,78.93z M19.64,81.83c0.09,0.14,0.67,4.97,1.37,11.57c0.21,1.99,0.42,3.91,0.47,4.28l0.08,0.65l-0.38-0.24c-0.29-0.2-0.39-0.39-0.39-0.74 c0-0.95-0.65-7.22-1.15-11.06c-0.29-2.18-0.51-4.09-0.51-4.28C19.13,81.69,19.49,81.57,19.64,81.83L19.64,81.83z M106.85,88.14 l-0.11,6.32l-0.38,0.56c-0.86,1.27-0.82,1.51-0.77-5.56l0.03-6.48l0.56-0.57c0.3-0.3,0.6-0.56,0.67-0.56 C106.89,81.84,106.89,84.68,106.85,88.14L106.85,88.14L106.85,88.14z M92.87,98.16c0.08,8.78,0.06,9.46-0.18,9.73 c-0.15,0.17-0.29,0.27-0.33,0.23c-0.11-0.12-0.26-19.27-0.14-19.37c0.06-0.06,0.21-0.09,0.35-0.08 C92.76,88.72,92.81,89.79,92.87,98.16L92.87,98.16L92.87,98.16z M43.52,92.15c0.11,0.94,0.48,5.42,0.63,7.54 c0.09,1.42,0.09,1.47-0.24,1.57c-0.18,0.06-0.39,0.05-0.45-0.03c-0.11-0.11-0.44-3.46-0.85-8.63l-0.11-1.24h0.47 C43.41,91.36,43.44,91.39,43.52,92.15L43.52,92.15z M31.64,97.44c0.11,0.11,0.18,0.48,0.18,0.86c0,0.39,0.18,2.43,0.38,4.55 c0.57,5.79,0.62,6.57,0.36,6.42c-0.39-0.23-0.74-0.57-0.67-0.67c0.03-0.06-0.03-0.82-0.15-1.68c-0.11-0.88-0.24-2.3-0.3-3.17 c-0.06-0.88-0.2-2.48-0.32-3.55c-0.29-2.64-0.27-2.95,0.06-2.95C31.34,97.25,31.53,97.33,31.64,97.44L31.64,97.44L31.64,97.44z M38.79,107.61c0.05,0.33,0.14,1.57,0.2,2.75c0.11,2.27,0.06,2.43-0.56,1.96c-0.18-0.14-0.3-0.71-0.48-2.43 c-0.32-3.11-0.33-2.99,0.26-2.93C38.63,107,38.7,107.06,38.79,107.61L38.79,107.61L38.79,107.61z"/><path d="M33.39,51.68c-1.57,0.68-1.69,2.81-0.21,3.57c1.07,0.54,2.16,0.29,2.72-0.65 C36.96,52.87,35.23,50.88,33.39,51.68L33.39,51.68L33.39,51.68z M43.64,53.13c-1.45,0.89-1.45,3.04,0,3.93 c1.44,0.86,3.29-0.27,3.29-1.99C46.93,53.4,45.03,52.29,43.64,53.13L43.64,53.13z"/></g></svg>;
    case 'Vanilla': return <FileCode className={className} style={{ color: '#f7df1e' }} />;
    case 'PostgreSQL': return <Database className={className} style={{ color: '#336791' }} />;
    case 'SQLite': return <Database className={className} style={{ color: '#003b57' }} />;
    case 'MySQL': return <svg viewBox="0 0 448 512" className={className} fill="#00758f"><path d="M441.4 128.1c-1.1-2.1-3.3-3.4-5.6-3.4H12.2c-2.3 0-4.5 1.3-5.6 3.4-1.1 2.1-.9 4.6.5 6.5l214.3 251.4c1.1 1.3 2.7 2.1 4.4 2.1s3.3-.8 4.4-2.1l214.3-251.4c1.4-1.9 1.6-4.4.5-6.5z"/></svg>;
    case 'MongoDB': return <svg viewBox="0 0 320 512" className={className} fill="#47a248"><path d="M288 256c0 110.5-89.5 200-200 200S-112 366.5-112 256 177.5 56 288 256z"/></svg>;
    case 'Redis': return <svg viewBox="0 0 448 512" className={className} fill="#d82c20"><path d="M441.4 128.1c-1.1-2.1-3.3-3.4-5.6-3.4H12.2c-2.3 0-4.5 1.3-5.6 3.4-1.1 2.1-.9 4.6.5 6.5l214.3 251.4c1.1 1.3 2.7 2.1 4.4 2.1s3.3-.8 4.4-2.1l214.3-251.4c1.4-1.9 1.6-4.4.5-6.5z"/></svg>;
    default: return <Terminal className={className} />;
  }
};

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: { name: string; config: any; goal: string }) => void;
}

export function ProjectWizard({ isOpen, onClose, onCreate }: ProjectWizardProps) {
  const initialFormData = {
    name: '',
    folder: '',
    type: 'aplicacion web',
    goal: '',
    language: 'JavaScript',
    runtime: 'Vanilla',
    packageManager: 'npm',
    framework: 'Next.js',
    database: 'SQLite'
  };
  const [step, setStep] = useState(1);
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4001').replace('localhost', '127.0.0.1');
  const [workspaceRoot, setWorkspaceRoot] = useState("D:\\_DEVELOPMENTS\\AITENETIA_PROJECTS");

  const [formData, setFormData] = useState(initialFormData);

  const resetWizard = () => {
    setStep(1);
    setFormData(initialFormData);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleNameChange = (val: string) => {
    const limitedName = val.slice(0, 25);
    const slug = limitedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setFormData({ ...formData, name: limitedName, folder: slug });
  };

  useEffect(() => {
    if (!isOpen) return;

    fetch(`${API_URL}/api/v1/system/config`)
      .then((res) => res.json())
      .then((data: any) => {
        if (data?.workspaceRoot) {
          setWorkspaceRoot(data.workspaceRoot);
        }
      })
      .catch(() => {
        // Fallback local si el backend no responde.
      });
  }, [API_URL, isOpen]);

  useEffect(() => {
    if (isOpen) {
      resetWizard();
    }
  }, [isOpen]);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const isStepValid = () => {
    switch (step) {
      case 1: return formData.name.trim() !== '' && formData.goal.trim() !== '';
      case 2: return !!formData.language && !!formData.runtime && !!formData.packageManager;
      case 3: return !!formData.framework && !!formData.database;
      default: return true;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: formData.name,
      goal: formData.goal,
      config: { ...formData }
    });
    handleClose();
  };

  const OptionCard = ({ icon: Icon, customLogo, label, value, current, field, disabled, star, color }: any) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setFormData({ ...formData, [field]: value })}
      className={`relative p-3 rounded-md border transition-all flex flex-col items-center gap-2 group ${
        current === value 
          ? 'bg-white/10 border-white/20 text-white shadow-lg' 
          : disabled ? 'opacity-10 grayscale cursor-not-allowed border-white/[0.01]' : 'bg-white/[0.02] border-white/[0.05] text-white/30 hover:border-white/10'
      }`}
    >
      {customLogo ? <TechLogo name={customLogo} className="w-5 h-5" color={current === value ? color : undefined} /> : <Icon size={16} className={current === value ? 'text-primary' : ''} />}
      <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-none">{label}</span>
      {star && <Sparkles size={8} className="absolute top-1 right-1 text-primary animate-pulse" />}
      {current === value && <div className="absolute bottom-1 right-1"><Check size={10} className="text-primary" strokeWidth={4} /></div>}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl bg-[#09090b] border border-white/[0.05] rounded-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="h-[2px] w-full bg-white/[0.03] flex">
               {[1, 2, 3, 4].map(i => <div key={i} className={`flex-1 transition-all duration-500 ${i <= step ? 'bg-primary' : ''}`} />)}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-white/40"><Sparkles size={18} /></div>
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-tight">System_Initialization</h2>
                    <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Phase {step} of 4</p>
                  </div>
                </div>
                <button onClick={handleClose} className="text-white/20 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} className="min-h-[400px] flex flex-col justify-between">
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                  {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                       <div className="space-y-1.5">
                          <div className="flex justify-between items-center ml-1">
                            <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Project Alias</label>
                            <span className="text-[8px] text-white/10">{formData.name.length}/25</span>
                          </div>
                          <input type="text" required maxLength={25} value={formData.name} onChange={e => handleNameChange(e.currentTarget.value)} placeholder="e.g. Neural Engine" className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-md text-[12px] text-white focus:border-white/20 outline-none transition-all" />
                       </div>

                       <div className="space-y-3">
                          <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">What are you building?</label>
                          <div className="grid grid-cols-2 gap-2">
                             {[
                               { id: 'landingPage', label: 'Landing Page', icon: Monitor },
                               { id: 'aplicacion web', label: 'Web Application', icon: Layout, star: true },
                               { id: 'API', label: 'API / Backend', icon: Share2 },
                               { id: 'wpa', label: 'Mobile App (PWA / Native)', icon: AppWindow },
                               { id: 'qaAutomation', label: 'Automation / QA', icon: Beaker },
                             ].map((t) => (
                               <button
                                 key={t.id}
                                 type="button"
                                 onClick={() => setFormData({ ...formData, type: t.id })}
                                 className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                                   formData.type === t.id 
                                     ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                                     : 'bg-white/[0.01] border-white/[0.03] text-white/30 hover:border-white/10'
                                 }`}
                               >
                                 <t.icon size={14} className={formData.type === t.id ? 'text-primary' : ''} />
                                 <div className="flex items-center gap-1.5">
                                   <span className="text-[10px] font-bold uppercase tracking-tighter">{t.label}</span>
                                   {t.star && <Sparkles size={10} className="text-primary animate-pulse" />}
                                 </div>
                                 {formData.type === t.id && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">Physical Storage</label>
                          <div className="flex flex-col gap-2 p-3 bg-black/40 border border-white/[0.05] rounded-md opacity-80 group">
                             <div className="flex items-center gap-2 text-white/20">
                                <HardDrive size={12} />
                                <span className="text-[10px] font-mono truncate">{workspaceRoot}</span>
                             </div>
                             <div className="text-[12px] font-mono flex items-center gap-1">
                                <span className={formData.folder ? "text-primary/60" : "text-white/10"}>
                                  {formData.folder || 'pending_alias...'}
                                </span>
                                {formData.name.length > 0 && <div className="w-1 h-3 bg-primary/20 animate-pulse" />}
                             </div>
                          </div>
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">Core Objective</label>
                          <textarea rows={2} required value={formData.goal} onChange={e => setFormData({...formData, goal: e.currentTarget.value})} placeholder="Architecture metadata and project scope..." className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-md text-[12px] text-white focus:border-white/20 outline-none transition-all resize-none" />
                       </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                       <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">Base Language</label>
                          <div className="grid grid-cols-6 gap-2">
                             {['JavaScript', 'TypeScript', 'Python', 'PHP', 'Java', 'Go'].map(lang => (
                               <OptionCard key={lang} customLogo={lang === 'JavaScript' ? 'JS' : lang === 'TypeScript' ? 'TS' : lang} label={lang === 'JavaScript' ? 'JS' : lang === 'TypeScript' ? 'TS' : lang} value={lang} current={formData.language} field="language" disabled={lang !== 'JavaScript' && lang !== 'TypeScript'} />
                             ))}
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">Runtime Environment</label>
                             <div className="grid grid-cols-2 gap-2">
                                {['Vanilla', 'Node.js', 'Bun', 'Deno'].map(rt => <OptionCard key={rt} customLogo={rt} label={rt} value={rt} current={formData.runtime} field="runtime" />)}
                             </div>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">Package Control</label>
                             <div className="grid grid-cols-2 gap-2">
                                {['npm', 'yarn', 'pnpm', 'bun'].map(pm => <OptionCard key={pm} icon={Package} label={pm} value={pm} current={formData.packageManager} field="packageManager" />)}
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                       <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">Architecture Framework</label>
                          <div className="grid grid-cols-3 gap-3">
                             {[
                               { id: 'Next.js', label: 'Next.js', star: true },
                               { id: 'React', label: 'React' },
                               { id: 'Astro', label: 'Astro' },
                               { id: 'Express', label: 'Express' },
                               { id: 'NestJS', label: 'NestJS' }
                               ].map(fw => <OptionCard key={fw.id} icon={Layout} label={fw.label} value={fw.id} current={formData.framework} field="framework" star={fw.star} />)}
                               </div>
                               </div>
                               <div className="space-y-1.5">
                               <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest ml-1">Persistence Layer</label>
                               <div className="grid grid-cols-5 gap-2">
                               {['SQLite', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis'].map(db => (
                               <OptionCard key={db} customLogo={db === 'PostgreSQL' ? 'PostgreSQL' : undefined} icon={Database} label={db} value={db} current={formData.database} field="database" star={db === 'PostgreSQL'} />
                               ))}
                               </div>
                               </div>                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                       <div className="space-y-4 rounded-md border border-white/[0.05] bg-white/[0.02] p-4">
                          <div>
                            <h4 className="text-primary text-[9px] font-bold uppercase tracking-[0.2em]">Project Summary</h4>
                            <p className="mt-2 text-xs leading-relaxed text-white/45">
                              Esta pantalla registra el proyecto y lanza la preparación del ambiente Docker.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="rounded-md border border-white/[0.05] bg-black/20 p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Project</div>
                                <div className="mt-2 text-sm font-bold text-white">{formData.name}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-primary/70">{formData.type}</div>
                             </div>
                             <div className="rounded-md border border-white/[0.05] bg-black/20 p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Workspace</div>
                                <div className="mt-2 break-all text-[11px] font-mono text-white/70">{workspaceRoot}\\{formData.folder}</div>
                             </div>
                             <div className="rounded-md border border-white/[0.05] bg-black/20 p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Stack</div>
                                <div className="mt-2 text-[11px] text-white/70">{formData.language} · {formData.runtime} · {formData.framework}</div>
                                <div className="mt-1 text-[11px] text-white/45">{formData.packageManager} · {formData.database}</div>
                             </div>
                             <div className="rounded-md border border-white/[0.05] bg-black/20 p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Environment</div>
                                <div className="mt-2 text-[11px] text-white/70">Dockerfile + image build</div>
                                <div className="mt-1 text-[11px] text-white/45">Container bootstrap and validation</div>
                             </div>
                          </div>
                       </div>
                       <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
                          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Objective Snapshot</div>
                          <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-white/65">{formData.goal}</p>
                       </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 flex justify-between gap-3">
                  <button type="button" onClick={step > 1 ? prevStep : handleClose} className="flex-1 py-2 rounded-md bg-white/[0.03] text-white/60 text-[10px] font-bold uppercase border border-white/[0.05] hover:bg-white/[0.05]">
                     {step > 1 ? 'Back' : 'Cancel'}
                  </button>
                  {step < 4 ? (
                    <button type="button" onClick={() => setStep(step + 1)} disabled={!isStepValid()} className="flex-1 py-2 rounded-md bg-white text-black text-[10px] font-bold uppercase hover:bg-white/90 disabled:opacity-30">
                       Next Phase
                    </button>                  ) : (
                    <button type="submit" disabled={!formData.goal} className="flex-1 py-2 rounded-md bg-primary text-white text-[10px] font-bold uppercase shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-30">
                       Preparar Ambiente
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
