/**
 * Image Editor - 图片编辑器
 * 提供图片裁剪、旋转等功能
 */

class ImageEditor {
  constructor() {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.startLeft = 0;
    this.startTop = 0;
    this.bindEvents();
  }

  bindEvents() {
    // 全局鼠标/触摸事件
    document.addEventListener('mousemove', (e) => this.handleDrag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
    document.addEventListener('touchmove', (e) => this.handleDrag(e.touches[0]), { passive: false });
    document.addEventListener('touchend', () => this.stopDrag());
  }

  initCropArea() {
    const cropArea = document.getElementById('crop-area');
    const previewImg = document.getElementById('preview-image');
    
    if (!cropArea || !previewImg) return;

    // 清除现有手柄
    cropArea.querySelectorAll('.resize-handle').forEach(handle => handle.remove());

    // 创建调整手柄
    const handles = [
      { className: 'resize-handle top-left', style: 'top: -8px; left: -8px; cursor: nwse-resize;' },
      { className: 'resize-handle top-right', style: 'top: -8px; right: -8px; cursor: nesw-resize;' },
      { className: 'resize-handle bottom-left', style: 'bottom: -8px; left: -8px; cursor: nesw-resize;' },
      { className: 'resize-handle bottom-right', style: 'bottom: -8px; right: -8px; cursor: nwse-resize;' },
      { className: 'resize-handle top', style: 'top: -8px; left: 50%; transform: translateX(-50%); cursor: ns-resize;' },
      { className: 'resize-handle bottom', style: 'bottom: -8px; left: 50%; transform: translateX(-50%); cursor: ns-resize;' },
      { className: 'resize-handle left', style: 'left: -8px; top: 50%; transform: translateY(-50%); cursor: ew-resize;' },
      { className: 'resize-handle right', style: 'right: -8px; top: 50%; transform: translateY(-50%); cursor: ew-resize;' }
    ];

    handles.forEach(handleConfig => {
      const handle = document.createElement('div');
      handle.className = handleConfig.className;
      handle.style.cssText = `
        position: absolute;
        width: 16px;
        height: 16px;
        background-color: #6366f1;
        border: 2px solid white;
        border-radius: 50%;
        ${handleConfig.style}
        z-index: 20;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;
      cropArea.appendChild(handle);

      // 绑定调整事件
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startResize(e, handleConfig.className);
      });
      
      handle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.startResize(e.touches[0], handleConfig.className);
      }, { passive: false });
    });

    // 绑定拖动事件
    cropArea.addEventListener('mousedown', (e) => {
      if (!e.target.classList.contains('resize-handle')) {
        this.startDrag(e);
      }
    });
    
    cropArea.addEventListener('touchstart', (e) => {
      if (!e.target.classList.contains('resize-handle')) {
        this.startDrag(e.touches[0]);
      }
    }, { passive: false });

    // 设置初始大小和位置 - 默认为整张图片
    const imgRect = previewImg.getBoundingClientRect();
    const width = imgRect.width;
    const height = imgRect.height;
    const left = 0;
    const top = 0;

    cropArea.style.width = `${width}px`;
    cropArea.style.height = `${height}px`;
    cropArea.style.left = `${left}px`;
    cropArea.style.top = `${top}px`;
  }

  startDrag(e) {
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;

    const cropArea = document.getElementById('crop-area');
    const previewImg = document.getElementById('preview-image');

    if (cropArea && previewImg) {
      this.startLeft = parseFloat(cropArea.style.left) || 0;
      this.startTop = parseFloat(cropArea.style.top) || 0;
    }
  }

  startResize(e, handleClass) {
    this.isResizing = true;
    this.resizeHandle = handleClass;
    this.startX = e.clientX;
    this.startY = e.clientY;

    const cropArea = document.getElementById('crop-area');
    if (cropArea) {
      this.startWidth = parseFloat(cropArea.style.width) || cropArea.offsetWidth;
      this.startHeight = parseFloat(cropArea.style.height) || cropArea.offsetHeight;
      this.startLeft = parseFloat(cropArea.style.left) || 0;
      this.startTop = parseFloat(cropArea.style.top) || 0;
    }
  }

  handleDrag(e) {
    if (!this.isDragging && !this.isResizing) return;

    const cropArea = document.getElementById('crop-area');
    const previewImg = document.getElementById('preview-image');

    if (!cropArea || !previewImg) return;

    const imgRect = previewImg.getBoundingClientRect();
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    if (this.isResizing) {
      this.handleResize(deltaX, deltaY, imgRect);
    } else if (this.isDragging) {
      this.handleMove(deltaX, deltaY, imgRect, cropArea);
    }
  }

  handleResize(deltaX, deltaY, imgRect) {
    const cropArea = document.getElementById('crop-area');
    if (!cropArea) return;

    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    let newLeft = this.startLeft;
    let newTop = this.startTop;

    const minSize = 50;

    switch (this.resizeHandle) {
      case 'resize-handle top-left':
        newWidth = Math.max(minSize, this.startWidth - deltaX);
        newHeight = Math.max(minSize, this.startHeight - deltaY);
        newLeft = Math.min(this.startLeft + deltaX, this.startLeft + this.startWidth - minSize);
        newTop = Math.min(this.startTop + deltaY, this.startTop + this.startHeight - minSize);
        break;
      case 'resize-handle top-right':
        newWidth = Math.max(minSize, this.startWidth + deltaX);
        newHeight = Math.max(minSize, this.startHeight - deltaY);
        newTop = Math.min(this.startTop + deltaY, this.startTop + this.startHeight - minSize);
        break;
      case 'resize-handle bottom-left':
        newWidth = Math.max(minSize, this.startWidth - deltaX);
        newHeight = Math.max(minSize, this.startHeight + deltaY);
        newLeft = Math.min(this.startLeft + deltaX, this.startLeft + this.startWidth - minSize);
        break;
      case 'resize-handle bottom-right':
        newWidth = Math.max(minSize, this.startWidth + deltaX);
        newHeight = Math.max(minSize, this.startHeight + deltaY);
        break;
      case 'resize-handle top':
        newHeight = Math.max(minSize, this.startHeight - deltaY);
        newTop = Math.min(this.startTop + deltaY, this.startTop + this.startHeight - minSize);
        break;
      case 'resize-handle bottom':
        newHeight = Math.max(minSize, this.startHeight + deltaY);
        break;
      case 'resize-handle left':
        newWidth = Math.max(minSize, this.startWidth - deltaX);
        newLeft = Math.min(this.startLeft + deltaX, this.startLeft + this.startWidth - minSize);
        break;
      case 'resize-handle right':
        newWidth = Math.max(minSize, this.startWidth + deltaX);
        break;
    }

    // 边界限制
    newLeft = Math.max(0, newLeft);
    newTop = Math.max(0, newTop);
    newWidth = Math.min(newWidth, imgRect.width - newLeft);
    newHeight = Math.min(newHeight, imgRect.height - newTop);

    cropArea.style.width = `${newWidth}px`;
    cropArea.style.height = `${newHeight}px`;
    cropArea.style.left = `${newLeft}px`;
    cropArea.style.top = `${newTop}px`;
  }

  handleMove(deltaX, deltaY, imgRect, cropArea) {
    let newLeft = this.startLeft + deltaX;
    let newTop = this.startTop + deltaY;

    const cropWidth = parseFloat(cropArea.style.width) || cropArea.offsetWidth;
    const cropHeight = parseFloat(cropArea.style.height) || cropArea.offsetHeight;

    // 边界限制
    newLeft = Math.max(0, Math.min(newLeft, imgRect.width - cropWidth));
    newTop = Math.max(0, Math.min(newTop, imgRect.height - cropHeight));

    cropArea.style.left = `${newLeft}px`;
    cropArea.style.top = `${newTop}px`;
  }

  stopDrag() {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  getCropArea() {
    const cropArea = document.getElementById('crop-area');
    const previewImg = document.getElementById('preview-image');

    if (!cropArea || !previewImg) return null;

    const imgRect = previewImg.getBoundingClientRect();
    const cropRect = cropArea.getBoundingClientRect();

    return {
      x: cropRect.left - imgRect.left,
      y: cropRect.top - imgRect.top,
      width: cropRect.width,
      height: cropRect.height
    };
  }

  cropImage(imageData) {
    const cropArea = this.getCropArea();
    const previewImg = document.getElementById('preview-image');

    if (!cropArea || !previewImg) return Promise.resolve(imageData);

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        // 计算比例
        const scaleX = img.width / previewImg.clientWidth;
        const scaleY = img.height / previewImg.clientHeight;

        canvas.width = cropArea.width * scaleX;
        canvas.height = cropArea.height * scaleY;

        ctx.drawImage(
          img,
          cropArea.x * scaleX,
          cropArea.y * scaleY,
          cropArea.width * scaleX,
          cropArea.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const croppedData = canvas.toDataURL('image/jpeg', 0.9);
        resolve(croppedData);
      };
      img.src = imageData;
    });
  }
}

// 创建全局实例
const imageEditor = new ImageEditor();
