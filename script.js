// 确保DOM完全加载后再执行脚本
document.addEventListener('DOMContentLoaded', () => {
    // 全局配置变量 - 原config.json内容已移至此处
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

    // --- DOM 元素引用 ---
    // 输入元素
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


    // 按钮元素
    const calculateBtn = document.getElementById('calculate-btn');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-btn');

    // 结果显示元素
    const storageTimeEl = document.getElementById('result-storage-time');
    const naturalLossEl = document.getElementById('result-natural-loss');
    const moistureLossEl = document.getElementById('result-moisture-loss');
    const impurityLossEl = document.getElementById('result-impurity-loss');
    const totalLossEl = document.getElementById('result-total-loss');
    const actualLossEl = document.getElementById('result-actual-loss');
    const actualLossRateEl = document.getElementById('result-actual-loss-rate');
    const overLossEl = document.getElementById('result-over-loss');
    const overLossStatusEl = document.getElementById('status-over-loss');

    // 其他UI元素
    const statusText = document.getElementById('status-text');

    // --- 初始化 ---
    
    // 填充作物品种下拉菜单
    function populateCropSelect() {
        const cropNames = Object.keys(config.loss_rate_config || {});
        cropTypeSelect.innerHTML = cropNames.map(name => `<option value="${name}">${name}</option>`).join('');
    }

    // 设置默认填报日期为今天
    function setDefaultReportDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        reportDateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // --- 核心计算逻辑 ---
    
    /**
     * 根据保管月数获取损耗率
     * @param {string} cropName - 作物品种
     * @param {number} months - 保管月数
     * @returns {number} - 损耗率
     */
    function getLossRate(cropName, months) {
        const rates = config.loss_rate_config[cropName];
        if (!rates) return 0;

        for (const rule of rates) {
            if (rule.max_value === null || months <= rule.max_value) {
                return rule.rate;
            }
        }
        return 0; // 如果没有匹配的规则，则返回0
    }

    /**
     * 主计算函数
     */
    function calculate() {
        updateStatus('开始计算...');

        // 1. 获取并转换输入数据
        const inDate = new Date(inDateInput.value);
        const outDate = new Date(outDateInput.value);
        const inMoisture = parseFloat(inMoistureInput.value) / 100;
        const outMoisture = parseFloat(outMoistureInput.value) / 100;
        const inImpurity = parseFloat(inImpurityInput.value) / 100;
        const outImpurity = parseFloat(outImpurityInput.value) / 100;
        const inQuantity = parseFloat(inQuantityInput.value);
        const outQuantity = parseFloat(outQuantityInput.value);
        const cropType = cropTypeSelect.value;

        // 数据有效性校验
        if (isNaN(inQuantity) || isNaN(outQuantity) || inDate > outDate) {
            updateStatus('错误：请输入有效的日期和数量！');
            alert('错误：请输入有效的日期和数量！\n- 入库数量和出库数量必须是数字。\n- 出库日期不能早于入库日期。');
            return;
        }

        // 2. 计算各项指标
        // 保管时间 (月)
        const dayDiff = (outDate - inDate) / (1000 * 60 * 60 * 24);
        const storageMonths = Math.ceil(dayDiff / 30); // 向上取整

        // 自然损耗量
        const lossRate = getLossRate(cropType, storageMonths);
        const naturalLoss = inQuantity * lossRate;

        // 水分减量
        let moistureLoss = 0;
        if (inMoisture >= outMoisture) {
            const moistureDiff = inMoisture - outMoisture;
            const dryBasis = 1 - outMoisture;
            if (dryBasis > 0) {
                 moistureLoss = inQuantity * moistureDiff / dryBasis;
            }
        }

        // 杂质减量
        let impurityLoss = 0;
        const impurityDiff = inImpurity - outImpurity;
        const purityBasis = 1 - outImpurity;
        if (purityBasis > 0 && impurityDiff >= 0) { // 杂质通常不会增加
            impurityLoss = inQuantity * impurityDiff / purityBasis;
        }


        // 合计: 先将各项损耗四舍五入到小数点后两位, 然后再相加
        const totalLoss = parseFloat(naturalLoss.toFixed(2)) + 
                        parseFloat(moistureLoss.toFixed(2)) + 
                        parseFloat(impurityLoss.toFixed(2));

        // 实际存储损耗
        const actualLoss = inQuantity - outQuantity;

        // 实际存储损耗率
        const actualLossRate = inQuantity > 0 ? (actualLoss / inQuantity) * 100 : 0;

        // 超耗数量
        const overLoss = actualLoss - totalLoss;

        // 3. 更新UI显示
        storageTimeEl.textContent = storageMonths;
        naturalLossEl.textContent = naturalLoss.toFixed(2);
        moistureLossEl.textContent = moistureLoss.toFixed(2);
        impurityLossEl.textContent = impurityLoss.toFixed(2);
        totalLossEl.textContent = totalLoss.toFixed(2);
        actualLossEl.textContent = actualLoss.toFixed(2);
        actualLossRateEl.textContent = `${actualLossRate.toFixed(2)}%`;
        // 如果不超耗（即超耗数量为负数），则显示为0
        overLossEl.textContent = Math.max(0, overLoss).toFixed(2);
        
        // 4. 处理超耗状态（使用原始overLoss值判断）
        handleOverLoss(overLoss);

        updateStatus('计算完成。');
    }

    /**
     * 处理超耗状态的UI反馈
     * @param {number} overLossValue - 超耗数量
     */
    function handleOverLoss(overLossValue) {
        const isOverLoss = overLossValue > 0;
        
        // 更新表格内的状态
        overLossStatusEl.textContent = isOverLoss ? '是' : '否';
        [overLossStatusEl, actualLossEl, actualLossRateEl, overLossEl].forEach(el => {
            el.classList.toggle('warning', isOverLoss);
        });
        
        if (isOverLoss) {
            updateStatus('计算完成 - 检测到超耗情况！');
        }
    }

    /**
     * 验证必填字段是否已填写完整
     * @returns {Object} - 包含验证结果和缺失字段列表的对象
     */
    function validateRequiredFields() {
        const missingFields = [];
        
        // 检查填报单位
        if (!reportUnitTitleInput.value.trim() && !reportUnitHeaderInput.value.trim()) {
            missingFields.push('• 填报单位');
        }
        
        // 检查填报时间
        if (!reportDateInput.value.trim()) {
            missingFields.push('• 填报时间');
        }
        
        // 检查货位号
        if (!document.getElementById('location-number').value.trim()) {
            missingFields.push('• 货位号');
        }
        
        // 检查入库日期
        if (!inDateInput.value.trim()) {
            missingFields.push('• 入库时间');
        }
        
        // 检查出库日期
        if (!outDateInput.value.trim()) {
            missingFields.push('• 出库时间');
        }
        
        // 检查入库水分
        if (!inMoistureInput.value.trim()) {
            missingFields.push('• 入库水分%');
        }
        
        // 检查出库水分
        if (!outMoistureInput.value.trim()) {
            missingFields.push('• 出库水分%');
        }
        
        // 检查入库杂质
        if (!inImpurityInput.value.trim()) {
            missingFields.push('• 入库杂质%');
        }
        
        // 检查出库杂质
        if (!outImpurityInput.value.trim()) {
            missingFields.push('• 出库杂质%');
        }
        
        // 检查入库数量
        if (!inQuantityInput.value.trim()) {
            missingFields.push('• 入库数量');
        }
        
        // 检查出库数量
        if (!outQuantityInput.value.trim()) {
            missingFields.push('• 出库数量');
        }
        
        // 检查是否已进行计算（查看结果表格是否有数据）
        if (storageTimeEl.textContent === '--' || naturalLossEl.textContent === '--') {
            missingFields.push('• 请先点击"计算损耗"按钮进行计算');
        }
        
        return {
            isValid: missingFields.length === 0,
            missingFields: missingFields
        };
    }
    
    // --- 事件处理 ---
    
    // 清空数据
    function clearData() {
        if (!confirm('确定要清空所有数据吗？')) return;

        // 获取页面上所有的 input 和 select 元素
        const formElements = document.querySelectorAll('input, select');

        formElements.forEach(el => {
            if (el.tagName.toLowerCase() === 'select') {
                // 重置下拉菜单到第一个选项
                el.selectedIndex = 0;
            } else if (el.type !== 'button' && el.type !== 'submit') {
                // 清空所有其他类型的输入框
                el.value = '';
            }
        });

        // 清空结果显示区域
        const resultCells = [
            storageTimeEl, naturalLossEl, moistureLossEl, impurityLossEl,
            totalLossEl, actualLossEl, actualLossRateEl, overLossEl, overLossStatusEl
        ];
        resultCells.forEach(cell => {
            cell.textContent = '--';
            cell.classList.remove('warning');
        });

        setDefaultReportDate(); // 将填报日期重置为今天
        updateStatus('数据已清空。');
    }

    // 导出JPG
    function exportJPG() {
        updateStatus('正在验证数据完整性...');
        
        // 数据完整性检查
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

        // 创建临时Logo元素，直接使用原始图片
        const logoImg = document.createElement('img');
        logoImg.src = 'logo.png';
        logoImg.style.position = 'absolute';
        logoImg.style.top = '15px';
        logoImg.style.left = '15px';
        logoImg.style.width = '120px';
        logoImg.style.height = 'auto';
        logoImg.style.zIndex = '1000';
        
        // 设置报告预览区域为相对定位，以便Logo绝对定位
        const originalPosition = reportElement.style.position;
        reportElement.style.position = 'relative';
        
        // 将Logo插入到报告预览区域
        reportElement.appendChild(logoImg);

        // 准备一个数组来存放临时的span元素，以便后续清理
        const temporarySpans = [];
        // 选取所有需要被替换的表单元素
        const elementsToReplace = reportElement.querySelectorAll('input, select');

        // 在截图前，将表单元素替换为纯文本
        elementsToReplace.forEach(el => {
            const span = document.createElement('span');
            let value = '';

            if (el.tagName.toLowerCase() === 'select') {
                // 对于下拉选择框，获取选中项的文本
                value = el.options[el.selectedIndex]?.text || '';
            } else {
                // 对于所有输入框，直接获取其值
                value = el.value;
            }

            span.textContent = value;
            temporarySpans.push(span); // 保存span以便之后移除

            el.style.display = 'none'; // 隐藏原始的表单元素
            el.parentNode.insertBefore(span, el); // 在原位置插入纯文本span
        });

        // 使用 html2canvas 截图
        html2canvas(reportElement, {
            scale: 2, // 提高分辨率，使图片更清晰
            useCORS: true,
            logging: false,
        }).then(canvas => {
            // 创建一个 a 标签用于下载
            const link = document.createElement('a');
            
            // 构建文件名
            const location = document.getElementById('location-number').value || '未知货位';
            const date = document.getElementById('report-date').value.replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
            link.download = `粮食保管损耗报告单_${location}_${date}.jpg`;
            
            // 将 canvas 转换为 JPG 格式的数据 URL
            link.href = canvas.toDataURL('image/jpeg', 0.95); // 0.95 是图片质量
            
            // 触发下载
            link.click();
            
            updateStatus(`报告单 ${link.download} 导出成功！`);
        }).catch(err => {
            console.error('导出图片时发生错误:', err);
            updateStatus('错误：图片导出失败。');
        }).finally(() => {
            // 无论成功或失败，都执行清理操作
            // 移除临时Logo
            logoImg.remove();
            
            // 恢复报告预览区域的原始定位样式
            reportElement.style.position = originalPosition;
            
            // 恢复原始的表单元素
            elementsToReplace.forEach(el => {
                el.style.display = ''; 
            });
            // 移除临时的span
            temporarySpans.forEach(span => {
                span.remove();
            });
        });
    }

    // 更新状态栏信息
    function updateStatus(message) {
        statusText.textContent = message;
    }
    
    // 自动格式化小数位
    function formatToOneDecimal(event) {
        const input = event.target;
        if(input.value === '') return; // 如果输入为空则不处理
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            input.value = value.toFixed(1);
        }
    }
 
    // --- 事件监听器绑定 ---
    calculateBtn.addEventListener('click', calculate);
    clearBtn.addEventListener('click', clearData);
    exportBtn.addEventListener('click', exportJPG);
    
    // 为水分和杂质输入框添加失去焦点事件监听器
    [inMoistureInput, outMoistureInput, inImpurityInput, outImpurityInput].forEach(input => {
        input.addEventListener('blur', formatToOneDecimal);
    });
 
 
    // 当任何输入改变时，提示用户需要重新计算
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
        el.addEventListener('input', () => updateStatus('数据已更改，请点击“计算损耗”按钮更新结果。'));
    });

    // --- 启动 ---
    populateCropSelect();
    setDefaultReportDate();
    updateStatus('系统就绪。');
});
