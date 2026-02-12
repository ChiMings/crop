// 确保DOM完全加载后再执行脚本
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素引用 ---
    const cropTypeSelect = document.getElementById('crop-type');
    const reportDateInput = document.getElementById('report-date');
    const reportUnitTitleInput = document.getElementById('report-unit-title');
    const reportUnitHeaderInput = document.getElementById('report-unit-header');
    
    const beforeDateInput = document.getElementById('before-date');
    const beforeMoistureInput = document.getElementById('before-moisture');
    const beforeImpurityInput = document.getElementById('before-impurity');
    const beforeQuantityInput = document.getElementById('before-quantity');
    
    const afterDateInput = document.getElementById('after-date');
    const afterMoistureInput = document.getElementById('after-moisture');
    const afterImpurityInput = document.getElementById('after-impurity');
    const afterQuantityInput = document.getElementById('after-quantity');

    const calculateBtn = document.getElementById('calculate-btn');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-btn');

    const lossQuantityEl = document.getElementById('result-loss-quantity');
    const lossRateEl = document.getElementById('result-loss-rate');
    const statusText = document.getElementById('status-text');
    
    // 自定义模态框元素
    const modal = document.getElementById('custom-confirm-modal');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const alertModal = document.getElementById('custom-alert-modal');
    const alertMessageEl = document.getElementById('custom-alert-message');
    const alertOkBtn = document.getElementById('modal-alert-ok-btn');
    
    // --- 初始化 ---
    function populateCropSelect() {
        const cropNames = ["玉米", "稻谷"];
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
    function showCustomAlert(message) {
        alertMessageEl.innerHTML = message;
        alertModal.classList.add('visible');
        alertOkBtn.focus();
    }

    // --- 核心计算逻辑 ---
    function calculate() {
        updateStatus('开始计算...');

        const beforeQuantity = parseFloat(beforeQuantityInput.value);
        const afterQuantity = parseFloat(afterQuantityInput.value);
        
        // 验证 Moisture 和 Impurity
        const beforeMoisture = parseFloat(beforeMoistureInput.value);
        const afterMoisture = parseFloat(afterMoistureInput.value);
        const beforeImpurity = parseFloat(beforeImpurityInput.value);
        const afterImpurity = parseFloat(afterImpurityInput.value);

        if (isNaN(beforeQuantity) || isNaN(afterQuantity)) {
            updateStatus('错误：请输入有效的数量！');
            showCustomAlert('错误：请输入有效的数量！<br>- "入库数量"和"平仓数量"必须是数字。');
            return;
        }

        if (beforeQuantity <= 0) {
            updateStatus('错误："入库数量"必须大于0！');
            showCustomAlert('错误："入库数量"必须大于0！');
            return;
        }
        
        if (beforeQuantity < afterQuantity) {
            updateStatus('警告："平仓数量"大于"入库数量"');
            showCustomAlert('警告："平仓数量"大于"入库数量"，这将导致负损耗。请检查输入是否正确。');
        }

        const lossQuantity = beforeQuantity - afterQuantity;
        const lossRate = (lossQuantity / beforeQuantity) * 100;

        lossQuantityEl.textContent = lossQuantity.toFixed(2);
        lossRateEl.textContent = `${lossRate.toFixed(2)}%`;
        
        updateStatus('计算完成。');
    }

    function validateRequiredFields() {
        const missingFields = [];
        if (!reportUnitTitleInput.value.trim() && !reportUnitHeaderInput.value.trim()) missingFields.push('• 填报单位');
        if (!reportDateInput.value) missingFields.push('• 填报时间');
        if (!document.getElementById('location-number').value.trim()) missingFields.push('• 货位号');
        if (!beforeDateInput.value) missingFields.push('• 入库时间');
        if (!beforeMoistureInput.value.trim()) missingFields.push('• 入库水分%');
        if (!beforeImpurityInput.value.trim()) missingFields.push('• 入库杂质%');
        if (!beforeQuantityInput.value.trim()) missingFields.push('• 入库数量');
        if (!afterDateInput.value) missingFields.push('• 平仓时间');
        if (!afterMoistureInput.value.trim()) missingFields.push('• 平仓水分%');
        if (!afterImpurityInput.value.trim()) missingFields.push('• 平仓杂质%');
        if (!afterQuantityInput.value.trim()) missingFields.push('• 平仓数量');
        if (lossQuantityEl.textContent === '--') missingFields.push('• 请先点击"计算"按钮');
        
        return {
            isValid: missingFields.length === 0,
            missingFields: missingFields.map(f => `&nbsp;&nbsp;${f}`).join('<br>')
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

        const resultCells = [lossQuantityEl, lossRateEl];
        resultCells.forEach(cell => {
            cell.textContent = '--';
        });

        setDefaultReportDate();
        updateStatus('数据已清空。');
        document.getElementById('location-number').focus();
    }

    function exportJPG() {
        updateStatus('正在验证数据完整性...');
        
        const validationResult = validateRequiredFields();
        if (!validationResult.isValid) {
            updateStatus('错误：数据填写不完整，无法导出！');
            showCustomAlert(`请填写完整以下必填项后再导出：<br><br><div style="text-align: left;">${validationResult.missingFields}</div>`);
            return;
        }
        
        updateStatus('正在生成报告图片...');
        
        const reportElement = document.querySelector('.report-preview');
        if (!reportElement) {
            updateStatus('错误：找不到报告元素。');
            return;
        }

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
            span.style.padding = '2px 4px';
            span.style.border = '1px solid transparent';
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
            link.download = `入库过程损耗报告单_${location}_${date}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
            updateStatus(`报告单 ${link.download} 导出成功！`);
        }).catch(err => {
            console.error('导出图片时发生错误:', err);
            updateStatus('错误：图片导出失败。');
        }).finally(() => {
            elementsToReplace.forEach(el => { el.style.display = ''; });
            temporarySpans.forEach(span => { span.remove(); });
        });
    }

    function updateStatus(message) {
        statusText.textContent = message;
    }

    function validateMoistureImpurityInput(event) {
        const input = event.target;
        let valueStr = input.value.trim();
        if (valueStr === '') return;

        // 检查是否为无效的数字格式
        if (isNaN(valueStr) || valueStr.endsWith('.') || (valueStr.match(/\./g) || []).length > 1 || (valueStr.lastIndexOf('-') > 0)) {
            showCustomAlert(`输入无效: "${valueStr}" 不是一个有效的数字。`);
            input.value = '';
            return;
        }

        let value = parseFloat(valueStr);

        if (value < 0) {
            showCustomAlert('输入无效: 水分和杂质不能为负数。');
            input.value = '0.0';
            return;
        }

        // 检查小数点位数
        if (valueStr.includes('.') && valueStr.split('.')[1].length > 1) {
            showCustomAlert('输入格式错误: 水分、杂质输入值仅允许保留一位小数');
            input.value = ''; // 清空输入框，强制用户重新输入
            return;
        }

        // 自动格式化为一位小数
        input.value = value.toFixed(1);
    }
    
    // --- 事件监听器绑定 ---
    calculateBtn.addEventListener('click', calculate);
    clearBtn.addEventListener('click', clearData);
    exportBtn.addEventListener('click', exportJPG);
 
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

    [beforeMoistureInput, beforeImpurityInput, afterMoistureInput, afterImpurityInput].forEach(input => {
        input.addEventListener('blur', validateMoistureImpurityInput);
    });

    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
        el.addEventListener('input', () => updateStatus('数据已更改，请点击“计算”按钮更新结果。'));
    });

    // --- 启动 ---
    populateCropSelect();
    setDefaultReportDate();
    updateStatus('系统就绪。');
});
