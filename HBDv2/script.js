/* ============================================================
   1. 基础配置
   ============================================================ */
const canvas = document.getElementById('auroraCanvas');
const ctx = canvas.getContext('2d');
const inputVideo = document.getElementsByClassName('input_video')[0];
const hbdVideo = document.getElementById('hbdVideo');
const bgmAudio = document.getElementById('bgmAudio'); // 【新增】：获取背景音乐元素

let width, height;
let tick = 0;
let mouse = { x: -1000, y: -1000 };

let particles = [];
let targetPinchFactor = 0;  
let currentPinchFactor = 0; 
let farMountains = [];
let nearMountains = [];
let isCameraWorking = false; 

function fbmNoise(x, time, seed) {
    return (Math.sin(x * 1.5 + time + seed) * 0.5 +
            Math.sin(x * 2.5 - time * 0.8 + seed * 2) * 0.3 +
            Math.sin(x * 4.0 + time * 1.2 + seed * 3) * 0.2);
}

/* ============================================================
   2. 初始化：生成粒子(爱心+文字)与崎岖山脉
   ============================================================ */
function init() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    
    // --- 提取文字坐标 ---
    let textCanvas = document.createElement('canvas');
    textCanvas.width = width;
    textCanvas.height = height;
    let tCtx = textCanvas.getContext('2d', { willReadFrequently: true });
    
    let fontSize = width < 768 ? 25 : 42; 
    tCtx.font = `italic bold ${fontSize}px "Segoe UI", "Times New Roman", serif`;
    tCtx.fillStyle = 'white';
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'middle';
    
    let textY = height * 0.35 - fontSize * 0.6; 
    tCtx.fillText('Happy Birthday', width / 2, textY);
    tCtx.fillText('to my star', width / 2, textY + fontSize * 1.2);

    let imgData = tCtx.getImageData(0, 0, width, height).data;
    let textPixels = [];
    for (let y = 0; y < height; y += 3) {
        for (let x = 0; x < width; x += 3) {
            let alpha = imgData[(y * width + x) * 4 + 3]; 
            if (alpha > 128) {
                textPixels.push({ x: x, y: y });
            }
        }
    }

    // --- 生成粒子 ---
    particles = [];
    const particleCount = 1800; 
    const heartRatio = 0.35;    

    const scale = Math.min(width, height) / 55; 
    const heartOffsetX = width / 2;
    const heartOffsetY = height * 0.35; 

    for (let i = 0; i < particleCount; i++) {
        let originX = Math.random() * width;
        let originY = Math.random() * height * 0.8;
        let targetX, targetY;

        if (i < particleCount * heartRatio || textPixels.length === 0) {
            let t = Math.random() * Math.PI * 2;
            let hXBase = scale * 16 * Math.pow(Math.sin(t), 3);
            let hYBase = - scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            targetX = heartOffsetX + hXBase + (Math.random() - 0.5) * 45;
            targetY = heartOffsetY + hYBase + (Math.random() - 0.5) * 45;
        } else {
            let randomPixel = textPixels[Math.floor(Math.random() * textPixels.length)];
            targetX = randomPixel.x; 
            targetY = randomPixel.y;
        }

        particles.push({
            originX: originX,
            originY: originY,
            targetX: targetX,
            targetY: targetY,
            size: Math.random() * 1.5 + 0.5,
            blinkPhase: Math.random() * Math.PI * 2,
            blinkSpeed: 0.02 + Math.random() * 0.05
        });
    }

    // --- 生成带有真实起伏的静止山脉 ---
    farMountains = []; nearMountains = [];
    let fx = 0;
    while(fx <= width) {
        farMountains.push({ x: fx, y: height * 0.8 - Math.random() * 80 });
        fx += Math.random() * 60 + 20; 
    }
    farMountains.push({ x: width + 100, y: height * 0.8 });

    let nx = 0;
    while(nx <= width) {
        nearMountains.push({ x: nx, y: height * 0.85 - Math.random() * 100 });
        nx += Math.random() * 80 + 30; 
    }
    nearMountains.push({ x: width + 100, y: height * 0.85 });
}

window.addEventListener('resize', init);
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

/* ============================================================
   3. 鼠标交互与媒体触发控制
   ============================================================ */
window.addEventListener('click', () => {
    // 【新增】：点击时同时触发视频和背景音乐播放
    if (hbdVideo && hbdVideo.paused) hbdVideo.play().catch(() => {});
    if (bgmAudio && bgmAudio.paused) bgmAudio.play().catch(() => {});
    
    if (!isCameraWorking) {
        targetPinchFactor = targetPinchFactor > 0.5 ? 0 : 1;
    }
});

/* ============================================================
   4. 渲染粒子、极光、山脉
   ============================================================ */
function drawParticles() {
    currentPinchFactor += (targetPinchFactor - currentPinchFactor) * 0.08;
    let easedFactor = currentPinchFactor * currentPinchFactor * (3 - 2 * currentPinchFactor);

    ctx.save();
    ctx.globalCompositeOperation = 'screen'; 
    
    particles.forEach(p => {
        let currentX = p.originX + (p.targetX - p.originX) * easedFactor;
        let currentY = p.originY + (p.targetY - p.originY) * easedFactor;
        let alphaBase = Math.abs(Math.sin(tick * p.blinkSpeed + p.blinkPhase));
        
        if (easedFactor > 0.5) {
            ctx.fillStyle = `rgba(${150 + 100 * easedFactor}, ${70 + 50 * easedFactor}, 255, ${0.4 + alphaBase * 0.6})`;
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + alphaBase * 0.7})`;
        }

        ctx.beginPath();
        ctx.arc(currentX, currentY, easedFactor > 0.5 ? p.size * 1.5 : p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawAuroras() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const curtains = [
        { yBase: height * 0.25, amplitude: 250, colorB: [0, 255, 120], colorT: [120, 50, 255], scale: 0.0015, speed: 0.0025, steps: 50, stepH: 4 },
        { yBase: height * 0.40, amplitude: 200, colorB: [0, 180, 255], colorT: [50, 80, 200], scale: 0.0020, speed: 0.0030, steps: 40, stepH: 3.5 },
        { yBase: height * 0.55, amplitude: 180, colorB: [180, 50, 255], colorT: [255, 100, 120], scale: 0.0025, speed: 0.0035, steps: 30, stepH: 3 },
        { yBase: height * 0.20, amplitude: 150, colorB: [0, 250, 200], colorT: [100, 150, 255], scale: 0.0012, speed: 0.0020, steps: 40, stepH: 5 },
        { yBase: height * 0.60, amplitude: 220, colorB: [50, 255, 50], colorT: [200, 200, 50], scale: 0.0018, speed: 0.0028, steps: 30, stepH: 3 }
    ];

    curtains.forEach((curtain, idx) => {
        let timeOffset = tick * curtain.speed;

        for (let i = 0; i < curtain.steps; i++) {
            ctx.beginPath();
            let progress = i / curtain.steps; 
            let r = Math.floor(curtain.colorB[0] * (1 - progress) + curtain.colorT[0] * progress);
            let g = Math.floor(curtain.colorB[1] * (1 - progress) + curtain.colorT[1] * progress);
            let b = Math.floor(curtain.colorB[2] * (1 - progress) + curtain.colorT[2] * progress);
            let alphaBase = (1 - progress) * 0.08; 
            if (progress > 0.6) alphaBase *= (1 - progress) / 0.4; 
            
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alphaBase})`;
            ctx.lineWidth = 8; 
            ctx.lineCap = 'round';

            for (let x = 0; x <= width; x += 15) {
                let noiseBase = fbmNoise(x * curtain.scale, timeOffset, idx * 10);
                let foldWobble = Math.sin(x * 0.006 + tick * 0.003) * i * 3.0; 
                let currentX = x + (i * 1.5); 
                let currentY = curtain.yBase + noiseBase * curtain.amplitude - (i * curtain.stepH) + foldWobble;

                let dx = x - mouse.x;
                let dy = (curtain.yBase + noiseBase * curtain.amplitude) - mouse.y; 
                if (Math.hypot(dx, dy) < 300) { 
                    currentY -= ((300 - Math.hypot(dx, dy)) / 300) * 150 * (1 - progress * 0.5); 
                }

                if (x === 0) ctx.moveTo(currentX, currentY);
                else ctx.lineTo(currentX, currentY);
            }
            ctx.stroke();
        }
    });
    ctx.restore();
}

function drawMountains() {
    ctx.save();
    
    let gradFar = ctx.createLinearGradient(0, height * 0.5, 0, height);
    gradFar.addColorStop(0, '#1c2836'); 
    gradFar.addColorStop(1, '#000000');
    ctx.fillStyle = gradFar;
    ctx.beginPath();
    ctx.moveTo(0, height);
    farMountains.forEach((pt, i) => {
        if (i === 0) ctx.lineTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
    });
    ctx.lineTo(width, height);
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.stroke();

    let gradNear = ctx.createLinearGradient(0, height * 0.7, 0, height);
    gradNear.addColorStop(0, '#0a0f14'); 
    gradNear.addColorStop(1, '#000000');
    ctx.fillStyle = gradNear;
    ctx.beginPath();
    ctx.moveTo(0, height);
    nearMountains.forEach((pt, i) => { ctx.lineTo(pt.x, pt.y); });
    ctx.lineTo(width, height);
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.stroke();
    
    ctx.restore();
}

/* ============================================================
   5. 【核心修改】智能切换提示语与动画视频
   ============================================================ */
function drawHbdVideo() {
    // 检查视频是否处于正常的播放状态
    let isVideoPlaying = hbdVideo && hbdVideo.readyState >= 2 && !hbdVideo.paused;

    if (isVideoPlaying) {
        // 视频正常播放时，显示视频
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 
        let vHeight = height * 0.18; 
        let vWidth = vHeight * (hbdVideo.videoWidth / hbdVideo.videoHeight);
        let vX = (width - vWidth) / 2;
        let vY = height - vHeight - 15; 
        ctx.globalAlpha = 0.95; 
        ctx.drawImage(hbdVideo, vX, vY, vWidth, vHeight);
        ctx.restore();
    } else {
        // 视频未播放或被拦截时，显示“点击一下！”引导语
        ctx.save();
        // 带呼吸闪烁效果的字体透明度
        let textAlpha = 0.4 + Math.abs(Math.sin(tick * 0.05)) * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
        ctx.font = 'bold 20px "Microsoft YaHei", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 文字位置大约放在屏幕正下方视频应该出现的位置
        let textY = height - (height * 0.18) / 2 - 15;
        ctx.fillText('点击一下！', width / 2, textY);
        ctx.restore();
    }
}

/* ============================================================
   6. 手势识别初始化 
   ============================================================ */
try {
    if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        hands.setOptions({
            maxNumHands: 1, 
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        hands.onResults((results) => {
            isCameraWorking = true; 
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const hand = results.multiHandLandmarks[0];
                const dist = Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y);
                let rawFactor = 1.0 - (dist - 0.02) / (0.25 - 0.02);
                targetPinchFactor = Math.max(0, Math.min(1, rawFactor)); 
            } else {
                targetPinchFactor = 0;
            }
        });

        const camera = new Camera(inputVideo, {
            onFrame: async () => { await hands.send({ image: inputVideo }); },
            width: 640, height: 480
        });

        camera.start().catch(() => {
            console.warn("手势系统被拦截，已自动切换为点击模式。");
        });
    }
} catch (error) {
    console.warn("手势库加载失败，不影响视觉呈现。");
}

/* ============================================================
   7. 启动引擎！
   ============================================================ */
init();

function draw() {
    ctx.fillStyle = '#001224'; 
    ctx.fillRect(0, 0, width, height);

    drawAuroras();   
    drawParticles(); 
    drawMountains(); 
    
    drawHbdVideo();  // 智能渲染视频或提示语

    tick += 1.8; 
    requestAnimationFrame(draw);
}

try {
    requestAnimationFrame(draw);
} catch (e) {
    ctx.fillStyle = '#000c18';
    ctx.fillRect(0, 0, width, height);
}
