// 确保DOM完全加载后再执行脚本
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素引用 ---
    const cropTypeSelect = document.getElementById('crop-type');
    const inDateInput = document.getElementById('in-date');
    const outDateInput = document.getElementById('out-date');
    const storageQuantityInput = document.getElementById('storage-quantity');
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
    const surplusQuantityEl = document.getElementById('result-surplus-quantity');
    const surplusRateEl = document.getElementById('result-surplus-rate');
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
        // 在这个版本中，我们没有基于作物品种的特定计算逻辑，
        // 但保留了这个函数以便未来扩展或保持界面一致性。
        // 您可以手动添加作物品种。
        const cropNames = ["玉米", "稻谷"];
        cropTypeSelect.innerHTML = cropNames.map(name => `<option value="${name}">${name}</option>`).join('');
    }

    function populateYearSelect() {
        const yearSelect = document.getElementById('production-year');
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 2020; year--) {
            yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
        }
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
        alertMessageEl.innerHTML = message; // Use innerHTML to allow line breaks
        alertModal.classList.add('visible');
        alertOkBtn.focus();
    }

    // --- 核心计算逻辑 ---
    function calculate() {
        updateStatus('开始计算...');

        const inDate = new Date(inDateInput.value);
        const outDate = new Date(outDateInput.value);
        const storageQuantity = parseFloat(storageQuantityInput.value);
        const outQuantity = parseFloat(outQuantityInput.value);

        if (isNaN(storageQuantity) || isNaN(outQuantity) || !inDateInput.value || !outDateInput.value || inDate > outDate) {
            updateStatus('错误：请输入有效的日期和数量！');
            showCustomAlert('错误：请输入有效的日期和数量！<br>- 保管账数量和出库数量必须是数字。<br>- 出库日期不能早于入库日期。');
            return;
        }
        
        if (storageQuantity <= 0) {
            updateStatus('错误：保管账数量必须大于0！');
            showCustomAlert('错误：保管账数量必须大于0！');
            return;
        }

        const dayDiff = (outDate - inDate) / (1000 * 60 * 60 * 24);
        const storageMonths = Math.round(dayDiff / 30);

        const surplusQuantity = storageQuantity - outQuantity;
        const surplusRate = (surplusQuantity / storageQuantity) * 100;

        storageTimeEl.textContent = storageMonths;
        surplusQuantityEl.textContent = surplusQuantity.toFixed(2);
        surplusRateEl.textContent = `${surplusRate.toFixed(2)}%`;
        
        updateStatus('计算完成。');
        
        setTimeout(() => {
            document.getElementById('location-number').focus();
        }, 0);
    }

    function validateRequiredFields() {
        const missingFields = [];
        if (!reportUnitTitleInput.value.trim() && !reportUnitHeaderInput.value.trim()) missingFields.push('• 填报单位');
        if (!reportDateInput.value) missingFields.push('• 填报时间');
        if (!document.getElementById('location-number').value.trim()) missingFields.push('• 货位号');
        if (!inDateInput.value) missingFields.push('• 入库时间');
        if (!outDateInput.value) missingFields.push('• 出库时间');
        if (!storageQuantityInput.value.trim()) missingFields.push('• 保管账数量');
        if (!outQuantityInput.value.trim()) missingFields.push('• 出库数量');
        if (storageTimeEl.textContent === '--' || surplusQuantityEl.textContent === '--') missingFields.push('• 请先点击"计算"按钮进行计算');
        
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

        const resultCells = [storageTimeEl, surplusQuantityEl, surplusRateEl];
        resultCells.forEach(cell => {
            cell.textContent = '--';
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
            link.download = `粮食溢余报告单_${location}_${date}.jpg`;
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

    inTypeSelect.addEventListener('change', () => updateStorageCondition(inTypeSelect, inConditionTd));
    outTypeSelect.addEventListener('change', () => updateStorageCondition(outTypeSelect, outConditionTd));

    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
        el.addEventListener('input', () => updateStatus('数据已更改，请点击“计算”按钮更新结果。'));
    });

    // --- 启动 ---
    populateCropSelect();
    populateYearSelect();
    setDefaultReportDate();
    updateStorageCondition(inTypeSelect, inConditionTd);
    updateStorageCondition(outTypeSelect, outConditionTd);
    updateStatus('系统就绪。');
});
