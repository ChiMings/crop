// Electron 环境下的修复版脚本
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    // 原有配置保持不变
    const config = {
      "loss_rate_config": {
        "玉米": [
          { "max_value": 6, "rate": 0.001 },
          { "max_value": 12, "rate": 0.0015 },
          { "max_value": null, "rate": 0.002 }
        ],
        "大豆": [
          { "max_value": 5, "rate": 0.001 },
          { "max_value": 11, "rate": 0.0015 },
          { "max_value": null, "rate": 0.003 }
        ]
      }
    };

    // DOM 元素引用
    const cropTypeSelect = document.getElementById('crop-type');
    const inDateInput = document.getElementById('in-date');
    const outDateInput = document.getElementById('out-date');
    const inMoistureInput = document.getElementById('in-moisture');
    const outMoistureInput = document.getElementById('out-moisture');
    const inImpurityInput = document.getElementById('in-impurity');
    const outImpurityInput = document.getElementById('out-impurity');
    const inQuantityInput = document.getElementById('in-quantity');
    const outQuantityInput = document.getElementById('out-quantity');
    const reportDateInput = document.getElementById('report-date');
    const reportUnitTitleInput = document.getElementById('report-unit-title');
    const reportUnitHeaderInput = document.getElementById('report-unit-header');

    const calculateBtn = document.getElementById('calculate-btn');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-btn');

    const storageTimeEl = document.getElementById('result-storage-time');
    const naturalLossEl = document.getElementById('result-natural-loss');
    const moistureLossEl = document.getElementById('result-moisture-loss');
    const impurityLossEl = document.getElementById('result-impurity-loss');
    const totalLossEl = document.getElementById('result-total-loss');
    const actualLossEl = document.getElementById('result-actual-loss');
    const actualLossRateEl = document.getElementById('result-actual-loss-rate');
    const overLossEl = document.getElementById('result-over-loss');
    const overLossStatusEl = document.getElementById('status-over-loss');
    const statusText = document.getElementById('status-text');

    // 初始化函数（保持原有逻辑）
    function populateCropSelect() {
        const cropNames = Object.keys(config.loss_rate_config || {});
        cropTypeSelect.innerHTML = cropNames.map(name => `<option value="${name}">${name}</option>`).join('');
    }

    function setDefaultReportDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        reportDateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    function getLossRate(cropName, months) {
        const rates = config.loss_rate_config[cropName];
        if (!rates) return 0;

        for (const rule of rates) {
            if (rule.max_value === null || months <= rule.max_value) {
                return rule.rate;
            }
        }
        return 0;
    }

    function calculate() {
        updateStatus('开始计算...');

        const inDate = new Date(inDateInput.value);
        const outDate = new Date(outDateInput.value);
        const inMoisture = parseFloat(inMoistureInput.value) / 100;
        const outMoisture = parseFloat(outMoistureInput.value) / 100;
        const inImpurity = parseFloat(inImpurityInput.value) / 100;
        const outImpurity = parseFloat(outImpurityInput.value) / 100;
        const inQuantity = parseFloat(inQuantityInput.value);
        const outQuantity = parseFloat(outQuantityInput.value);
        const cropType = cropTypeSelect.value;

        if (isNaN(inQuantity) || isNaN(outQuantity) || inDate > outDate) {
            updateStatus('错误：请输入有效的日期和数量！');
            alert('错误：请输入有效的日期和数量！\n- 入库数量和出库数量必须是数字。\n- 出库日期不能早于入库日期。');
            return;
        }

        const dayDiff = (outDate - inDate) / (1000 * 60 * 60 * 24);
        const storageMonths = Math.ceil(dayDiff / 30);

        const lossRate = getLossRate(cropType, storageMonths);
        const naturalLoss = inQuantity * lossRate;

        let moistureLoss = 0;
        if (inMoisture >= outMoisture) {
            const moistureDiff = inMoisture - outMoisture;
            const dryBasis = 1 - outMoisture;
            if (dryBasis > 0) {
                 moistureLoss = inQuantity * moistureDiff / dryBasis;
            }
        }

        let impurityLoss = 0;
        const impurityDiff = inImpurity - outImpurity;
        const purityBasis = 1 - outImpurity;
        if (purityBasis > 0 && impurityDiff >= 0) {
            impurityLoss = inQuantity * impurityDiff / purityBasis;
        }

        const totalLoss = parseFloat(naturalLoss.toFixed(2)) + 
                        parseFloat(moistureLoss.toFixed(2)) + 
                        parseFloat(impurityLoss.toFixed(2));

        const actualLoss = inQuantity - outQuantity;
        const actualLossRate = inQuantity > 0 ? (actualLoss / inQuantity) * 100 : 0;
        const overLoss = actualLoss - totalLoss;

        storageTimeEl.textContent = storageMonths;
        naturalLossEl.textContent = naturalLoss.toFixed(2);
        moistureLossEl.textContent = moistureLoss.toFixed(2);
        impurityLossEl.textContent = impurityLoss.toFixed(2);
        totalLossEl.textContent = totalLoss.toFixed(2);
        actualLossEl.textContent = actualLoss.toFixed(2);
        actualLossRateEl.textContent = `${actualLossRate.toFixed(2)}%`;
        overLossEl.textContent = Math.max(0, overLoss).toFixed(2);
        
        handleOverLoss(overLoss);
        updateStatus('计算完成。');
    }

    function handleOverLoss(overLossValue) {
        const isOverLoss = overLossValue > 0;
        
        overLossStatusEl.textContent = isOverLoss ? '是' : '否';
        [overLossStatusEl, actualLossEl, actualLossRateEl, overLossEl].forEach(el => {
            el.classList.toggle('warning', isOverLoss);
        });
        
        if (isOverLoss) {
            updateStatus('计算完成 - 检测到超耗情况！');
        }
    }

    function validateRequiredFields() {
        const missingFields = [];
        
        if (!reportUnitTitleInput.value.trim() && !reportUnitHeaderInput.value.trim()) {
            missingFields.push('• 填报单位');
        }
        
        if (!reportDateInput.value.trim()) {
            missingFields.push('• 填报时间');
        }
        
        if (!document.getElementById('location-number').value.trim()) {
            missingFields.push('• 货位号');
        }
        
        if (!inDateInput.value.trim()) {
            missingFields.push('• 入库时间');
        }
        
        if (!outDateInput.value.trim()) {
            missingFields.push('• 出库时间');
        }
        
        if (!inMoistureInput.value.trim()) {
            missingFields.push('• 入库水分%');
        }
        
        if (!outMoistureInput.value.trim()) {
            missingFields.push('• 出库水分%');
        }
        
        if (!inImpurityInput.value.trim()) {
            missingFields.push('• 入库杂质%');
        }
        
        if (!outImpurityInput.value.trim()) {
            missingFields.push('• 出库杂质%');
        }
        
        if (!inQuantityInput.value.trim()) {
            missingFields.push('• 入库数量');
        }
        
        if (!outQuantityInput.value.trim()) {
            missingFields.push('• 出库数量');
        }
        
        if (storageTimeEl.textContent === '--' || naturalLossEl.textContent === '--') {
            missingFields.push('• 请先点击"计算损耗"按钮进行计算');
        }
        
        return {
            isValid: missingFields.length === 0,
            missingFields: missingFields
        };
    }

    function clearData() {
        if (!confirm('确定要清空所有数据吗？')) return;

        const formElements = document.querySelectorAll('input, select');

        formElements.forEach(el => {
            if (el.tagName.toLowerCase() === 'select') {
                el.selectedIndex = 0;
            } else if (el.type !== 'button' && el.type !== 'submit') {
                el.value = '';
            }
        });

        const resultCells = [
            storageTimeEl, naturalLossEl, moistureLossEl, impurityLossEl,
            totalLossEl, actualLossEl, actualLossRateEl, overLossEl, overLossStatusEl
        ];
        resultCells.forEach(cell => {
            cell.textContent = '--';
            cell.classList.remove('warning');
        });

        setDefaultReportDate();
        updateStatus('数据已清空。');
    }

    // ====== 修复版导出功能 ======
    async function exportJPG() {
        updateStatus('正在验证数据完整性...');
        
        const validationResult = validateRequiredFields();
        if (!validationResult.isValid) {
            updateStatus('错误：数据填写不完整，无法导出！');
            alert(`请填写完整以下必填项后再导出：\n\n${validationResult.missingFields.join('\n')}`);
            return;
        }
        
        updateStatus('正在生成报告图片...');
        
        const reportElement = document.querySelector('.report-preview');
        if (!reportElement) {
            updateStatus('错误：找不到报告元素。');
            return;
        }

        // 创建Logo元素
        const logoImg = document.createElement('img');
        logoImg.src = 'logo.png';
        logoImg.style.cssText = `
            position: absolute;
            top: 15px;
            left: 15px;
            width: 120px;
            height: auto;
            z-index: 1000;
        `;
        
        // 保存原始样式
        const originalPosition = reportElement.style.position;
        const originalOverflow = reportElement.style.overflow;
        
        // 设置容器样式
        reportElement.style.position = 'relative';
        reportElement.style.overflow = 'visible';
        
        // 添加Logo
        reportElement.appendChild(logoImg);

        // 替换表单元素为文本
        const temporarySpans = [];
        const elementsToReplace = reportElement.querySelectorAll('input, select');

        elementsToReplace.forEach(el => {
            const span = document.createElement('span');
            span.style.cssText = `
                display: inline-block;
                padding: 2px 4px;
                min-width: 20px;
                min-height: 1em;
                background: transparent;
                border: none;
                font-family: inherit;
                font-size: inherit;
                color: inherit;
            `;

            let value = '';
            if (el.tagName.toLowerCase() === 'select') {
                value = el.options[el.selectedIndex]?.text || '';
            } else {
                value = el.value || '';
            }

            span.textContent = value;
            temporarySpans.push(span);

            el.style.display = 'none';
            el.parentNode.insertBefore(span, el);
        });

        try {
            // 等待Logo加载
            if (!logoImg.complete) {
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = () => {
                        console.warn('Logo加载失败，继续导出');
                        resolve();
                    };
                    // 3秒超时
                    setTimeout(resolve, 3000);
                });
            }

            // 短暂延迟确保DOM更新
            await new Promise(resolve => setTimeout(resolve, 200));

            console.log('开始html2canvas截图...');
            console.log('报告元素尺寸:', reportElement.offsetWidth, 'x', reportElement.offsetHeight);

            // 简化的html2canvas配置
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false,
                width: reportElement.offsetWidth,
                height: reportElement.offsetHeight,
                scrollX: 0,
                scrollY: 0,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight
            });

            console.log('Canvas生成成功:', canvas.width, 'x', canvas.height);

            // 检查canvas有效性
            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                throw new Error(`Canvas无效: ${canvas ? canvas.width + 'x' + canvas.height : 'null'}`);
            }

            // 转换为JPEG
            const imageData = canvas.toDataURL('image/jpeg', 0.95);
            
            if (!imageData || imageData === 'data:,' || imageData.length < 1000) {
                throw new Error('图片数据无效或过小');
            }

            console.log('图片数据生成成功，大小:', Math.round(imageData.length / 1024), 'KB');

            // 构建文件名
            const location = document.getElementById('location-number').value || '未知货位';
            const date = document.getElementById('report-date').value.replace(/-/g, '') || 
                        new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = `粮食保管损耗报告单_${location}_${date}.jpg`;

            // 保存文件
            const result = await ipcRenderer.invoke('save-image', imageData, filename);
            
            if (result.success) {
                updateStatus(`✅ 报告单已成功保存到: ${result.path}`);
                console.log('文件保存成功:', result.path);
            } else {
                throw new Error(result.message || '保存失败');
            }
            
        } catch (error) {
            console.error('导出失败:', error);
            updateStatus(`❌ 导出失败: ${error.message}`);
            
            // 如果是Electron环境问题，提供备选方案
            if (error.message.includes('ipcRenderer')) {
                updateStatus('❌ Electron环境异常，请尝试重启应用');
            }
        } finally {
            // 清理操作
            console.log('开始清理临时元素...');
            
            logoImg.remove();
            
            reportElement.style.position = originalPosition;
            reportElement.style.overflow = originalOverflow;
            
            elementsToReplace.forEach(el => {
                el.style.display = '';
            });
            
            temporarySpans.forEach(span => {
                span.remove();
            });
            
            console.log('清理完成');
        }
    }

    function updateStatus(message) {
        statusText.textContent = message;
        console.log('状态:', message);
    }
    
    function formatToOneDecimal(event) {
        const input = event.target;
        if(input.value === '') return;
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            input.value = value.toFixed(1);
        }
    }

    // 事件监听
    ipcRenderer.on('open-file-dialog', () => {
        updateStatus('打开文件功能待实现...');
    });

    ipcRenderer.on('save-current-crop', () => {
        exportJPG();
    });

    calculateBtn.addEventListener('click', calculate);
    clearBtn.addEventListener('click', clearData);
    exportBtn.addEventListener('click', exportJPG);
    
    [inMoistureInput, outMoistureInput, inImpurityInput, outImpurityInput].forEach(input => {
        input.addEventListener('blur', formatToOneDecimal);
    });

    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
        el.addEventListener('input', () => updateStatus('数据已更改，请点击"计算损耗"按钮更新结果。'));
    });

    // 启动
    populateCropSelect();
    setDefaultReportDate();
    updateStatus('启动成功');
    console.log('应用初始化完成');
});
