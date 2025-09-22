// 确保DOM完全加载后再执行脚本
document.addEventListener('DOMContentLoaded', () => {
    // 全局配置变量
    const config = {
      "loss_rate_config": {
        "玉米": [
          { "max_value": 6, "rate": 0.001 },
          { "max_value": 12, "rate": 0.0015 },
          { "max_value": null, "rate": 0.002 }
        ],
        "稻谷": [
          { "max_value": 5, "rate": 0.001 },
          { "max_value": 11, "rate": 0.0015 },
          { "max_value": null, "rate": 0.003 }
        ]
      }
    };

    // --- DOM 元素引用 ---
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
    
    // 型态和储存条件元素
    const inTypeSelect = document.getElementById('in-type');
    const outTypeSelect = document.getElementById('out-type');
    const inConditionTd = document.getElementById('in-condition');
    const outConditionTd = document.getElementById('out-condition');

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
    
    // 自定义模态框元素
    const modal = document.getElementById('custom-confirm-modal');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const alertModal = document.getElementById('custom-alert-modal');
    const alertMessageEl = document.getElementById('custom-alert-message');
    const alertOkBtn = document.getElementById('modal-alert-ok-btn');

    // 输入阈值
    const validationThresholds = {
        "玉米": {
            moisture: { min: 9.0, max: 14.5 }
        },
        "稻谷": {
            moisture: { min: 9.0, max: 15.0 }
        },
        "impurity": { // 杂质通用
            min: 0.0, max: 2.0
        }
    };

    // --- 初始化 ---
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

    // --- 辅助功能 ---
    function updateStorageCondition(typeSelect, conditionTd) {
        const selectedType = typeSelect.value;
        let condition = '标准仓房';
        if (selectedType === '罩棚仓') {
            condition = '非标准仓房';
        } else if (selectedType === '罩棚仓(露天)' || selectedType === '大堆(露天)') {
            condition = '露天';
        }
        conditionTd.textContent = condition;
    }

    function showCustomAlert(message) {
        alertMessageEl.textContent = message;
        alertModal.classList.add('visible');
        alertOkBtn.focus();
    }

    // --- 核心计算逻辑 ---
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
            showCustomAlert('错误：请输入有效的日期和数量！\n- 入库数量和出库数量必须是数字。\n- 出库日期不能早于入库日期。');
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
        
        setTimeout(() => {
            document.getElementById('location-number').focus();
        }, 0);
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
        if (!reportUnitTitleInput.value.trim() && !reportUnitHeaderInput.value.trim()) missingFields.push('• 填报单位');
        if (!reportDateInput.value.trim()) missingFields.push('• 填报时间');
        if (!document.getElementById('location-number').value.trim()) missingFields.push('• 货位号');
        if (!inDateInput.value.trim()) missingFields.push('• 入库时间');
        if (!outDateInput.value.trim()) missingFields.push('• 出库时间');
        if (!inMoistureInput.value.trim()) missingFields.push('• 入库水分%');
        if (!outMoistureInput.value.trim()) missingFields.push('• 出库水分%');
        if (!inImpurityInput.value.trim()) missingFields.push('• 入库杂质%');
        if (!outImpurityInput.value.trim()) missingFields.push('• 出库杂质%');
        if (!inQuantityInput.value.trim()) missingFields.push('• 入库数量');
        if (!outQuantityInput.value.trim()) missingFields.push('• 出库数量');
        if (storageTimeEl.textContent === '--' || naturalLossEl.textContent === '--') missingFields.push('• 请先点击"计算损耗"按钮进行计算');
        
        return {
            isValid: missingFields.length === 0,
            missingFields: missingFields
        };
    }
    
    // --- 事件处理 ---
    function clearData() {
        modal.classList.add('visible');
    }

    function executeClear() {
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

        updateStorageCondition(inTypeSelect, inConditionTd);
        updateStorageCondition(outTypeSelect, outConditionTd);
        setDefaultReportDate();
        updateStatus('数据已清空。');
        
        document.getElementById('location-number').focus();
    }

    function exportJPG() {
        updateStatus('正在验证数据完整性...');
        
        const validationResult = validateRequiredFields();
        if (!validationResult.isValid) {
            updateStatus('错误：数据填写不完整，无法导出！');
            showCustomAlert(`请填写完整以下必填项后再导出：\n\n${validationResult.missingFields.join('\n')}`);
            return;
        }
        
        updateStatus('正在生成报告图片...');
        
        const reportElement = document.querySelector('.report-preview');
        if (!reportElement) {
            updateStatus('错误：找不到报告元素。');
            return;
        }

        const logoImg = document.createElement('img');
        logoImg.src = 'logo.png';
        logoImg.style.cssText = `position: absolute; top: 15px; left: 15px; width: 120px; height: auto; z-index: 1000;`;
        
        const originalPosition = reportElement.style.position;
        reportElement.style.position = 'relative';
        reportElement.appendChild(logoImg);

        const temporarySpans = [];
        const elementsToReplace = reportElement.querySelectorAll('input, select');

        elementsToReplace.forEach(el => {
            const span = document.createElement('span');
            let value = '';
            if (el.tagName.toLowerCase() === 'select') {
                value = el.options[el.selectedIndex]?.text || '';
            } else {
                value = el.value;
            }
            span.textContent = value;
            temporarySpans.push(span);
            el.style.display = 'none';
            el.parentNode.insertBefore(span, el);
        });

        html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            logging: false,
        }).then(canvas => {
            const link = document.createElement('a');
            const location = document.getElementById('location-number').value || '未知货位';
            const date = document.getElementById('report-date').value.replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
            link.download = `粮食保管损耗报告单_${location}_${date}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
            updateStatus(`报告单 ${link.download} 导出成功！`);
        }).catch(err => {
            console.error('导出图片时发生错误:', err);
            updateStatus('错误：图片导出失败。');
        }).finally(() => {
            logoImg.remove();
            reportElement.style.position = originalPosition;
            elementsToReplace.forEach(el => { el.style.display = ''; });
            temporarySpans.forEach(span => { span.remove(); });
        });
    }

    function updateStatus(message) {
        statusText.textContent = message;
    }
    
    function formatAndValidateInput(event) {
        const input = event.target;
        let valueStr = input.value.trim();
        if (valueStr === '') return;

        // 新增：检查是否为无效的数字格式
        if (isNaN(valueStr) || valueStr.endsWith('.') || (valueStr.match(/\./g) || []).length > 1 || (valueStr.lastIndexOf('-') > 0)) {
            showCustomAlert(`输入无效: "${valueStr}" 不是一个有效的数字。`);
            input.value = '';
            return;
        }

        // 新增：检查小数点位数
        if (valueStr.includes('.') && valueStr.split('.')[1].length > 1) {
            showCustomAlert('输入格式错误: 水分、杂质输入值仅允许保留一位小数');
            input.value = ''; // 清空输入框，强制用户重新输入
            return;
        }
        
        let value = parseFloat(valueStr);
        if (isNaN(value)) return;

        const cropName = cropTypeSelect.value;
        const inputId = input.id;
        let min, max, originalValue = value;

        if (inputId.includes('moisture')) {
            const thresholds = validationThresholds[cropName]?.moisture;
            if (thresholds) {
                min = thresholds.min;
                max = thresholds.max;
            }
        } else if (inputId.includes('impurity')) {
            const thresholds = validationThresholds.impurity;
            min = thresholds.min;
            max = thresholds.max;
        }

        if (min !== undefined && max !== undefined) {
            if (value < min) value = min;
            if (value > max) value = max;
        }
        
        input.value = value.toFixed(1);

        if (originalValue !== value) {
            const fieldName = inputId.includes('moisture') ? '水分' : '杂质';
            updateStatus(`提示: ${cropName}${fieldName}值已自动校正至有效范围 [${min}-${max}]`);
        }
    }
 
    // --- 事件监听器绑定 ---
    calculateBtn.addEventListener('click', calculate);
    clearBtn.addEventListener('click', clearData);
    exportBtn.addEventListener('click', exportJPG);
    
    [inMoistureInput, outMoistureInput, inImpurityInput, outImpurityInput].forEach(input => {
        input.addEventListener('blur', formatAndValidateInput);
    });
 
    modalConfirmBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
        executeClear();
    });

    modalCancelBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
    });

    alertOkBtn.addEventListener('click', () => {
        alertModal.classList.remove('visible');
    });

    inTypeSelect.addEventListener('change', () => updateStorageCondition(inTypeSelect, inConditionTd));
    outTypeSelect.addEventListener('change', () => updateStorageCondition(outTypeSelect, outConditionTd));

    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
        el.addEventListener('input', () => updateStatus('数据已更改，请点击“计算损耗”按钮更新结果。'));
    });

    // --- 启动 ---
    populateCropSelect();
    setDefaultReportDate();
    updateStorageCondition(inTypeSelect, inConditionTd);
    updateStorageCondition(outTypeSelect, outConditionTd);
    updateStatus('系统就绪。');
});
