console.log('script.js loaded');

// --- State for selected dates ---
let holidaysSet = new Set();
let workdaysSet = new Set();
let allWeeksDataGlobal = []; // Store week data globally
let currentTableResources = []; // Global variable to store current table resources

// --- Date Picker Management ---
// Removed setupDatePicker function

document.addEventListener('DOMContentLoaded', () => {
    const projectYearInput = document.getElementById('projectYear');
    const startMonthInput = document.getElementById('startMonth');
    const projectDurationInput = document.getElementById('projectDuration');

    // --- New Date Picker Elements ---
    const holidaysPicker = document.getElementById('holidays-picker');
    const holidaysList = document.getElementById('holidays-list');

    const workdaysPicker = document.getElementById('workdays-picker');
    const workdaysList = document.getElementById('workdays-list');

    const generateTableBtn = document.getElementById('generateTableBtn');
    const addRowBtn = document.getElementById('addRowBtn');
    const exportBtn = document.getElementById('exportBtn');
    const tableContainer = document.getElementById('tableContainer');

    const resourceOptions = [
        "FICO顾问", "PP顾问", "MM顾问", "SD顾问", "HR顾问", "ABAP顾问", "BASIS顾问", "自定义"
    ];
    const defaultResources = [
        "FICO顾问", "PP顾问", "MM顾问", "SD顾问", "HR顾问", "ABAP顾问", "ABAP顾问", "BASIS顾问"
    ];


    function updateDateList(dateSet, listElement) {
        // Removed content as per user request
    }


    function getWorkingDays(startDate, endDate, holidays, workdays) {
        let count = 0;
        const curDate = new Date(startDate.getTime());
        while (curDate <= endDate) {
            // Timezone-safe method to get YYYY-MM-DD string
            const year = curDate.getFullYear();
            const month = String(curDate.getMonth() + 1).padStart(2, '0');
            const day = String(curDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            const dayOfWeek = curDate.getDay();

            if (workdays.has(dateString)) {
                count++;
            }
            else if (holidays.has(dateString)) {
                // Holiday, do nothing
            }
            else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }

            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    }

    function generateTable() {
        const year = parseInt(projectYearInput.value);
        const startMonth = parseInt(startMonthInput.value) - 1; // JS months are 0-indexed
        const duration = parseInt(projectDurationInput.value);

        const holidays = holidaysSet;
        const workdays = workdaysSet;

        if (isNaN(year) || isNaN(startMonth) || isNaN(duration) || duration < 1) {
            alert("请输入有效的项目年份、启动月份和项目周期！");
            return;
        }

        // Read current table data from DOM before regenerating
        currentTableResources = [];
        document.querySelectorAll('tbody tr:not(:last-child)').forEach(row => {
            const selectElement = row.querySelector('.resource-select');
            const customInput = row.querySelector('.custom-resource-input');
            const manDayInputs = row.querySelectorAll('.man-day-input');
            const unitPriceInput = row.querySelector('.unit-price-input');
            const remarksInput = row.querySelector('.remarks-input');

            const resource = {
                type: selectElement ? selectElement.value : '',
                customType: customInput ? customInput.value : '',
                manDays: Array.from(manDayInputs).map(input => input.value),
                unitPrice: unitPriceInput ? unitPriceInput.value : '',
                remarks: remarksInput ? remarksInput.value : '',
                isCustomVisible: customInput ? customInput.style.display === 'block' : false
            };

            // If custom input is visible, ensure resource type is '自定义'
            if (resource.isCustomVisible) {
                resource.type = '自定义';
            }
            currentTableResources.push(resource);
        });

        // If no resources are loaded or present, initialize with default
        if (currentTableResources.length === 0) {
            currentTableResources = defaultResources.map(name => ({
                type: name,
                customType: '',
                manDays: [],
                unitPrice: '3000',
                remarks: '',
                isCustomVisible: false
            }));
        }

        let tableHTML = '<table border="1"><thead>';
        let weekHeaders = '';
        let totalWeeks = 0;
        const allWeeksData = [];

        // Calculate project start and end dates
        const projectStartDate = new Date(year, startMonth, 1);
        const projectEndDate = new Date(year, startMonth + duration, 0); // Last day of the last month

        let currentWeekStart = new Date(projectStartDate);
        // Adjust currentWeekStart to the Monday of its week
        const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        currentWeekStart.setDate(currentWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

        // Iterate through weeks for the entire project duration
        while (currentWeekStart <= projectEndDate) {
            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6); // End of the current calendar week (Sunday)

            // Determine the effective start and end for this week within the project duration
            const effectiveStart = new Date(Math.max(projectStartDate.getTime(), currentWeekStart.getTime()));
            const effectiveEnd = new Date(Math.min(projectEndDate.getTime(), currentWeekEnd.getTime()));

            if (effectiveStart <= effectiveEnd) {
                const workingDays = getWorkingDays(effectiveStart, effectiveEnd, holidays, workdays);

                // Always add week data, even if workingDays is 0
                allWeeksData.push({
                    week: allWeeksData.length + 1, // Use array length for sequential week numbering
                    workingDays: workingDays,
                    displayRange: `${effectiveStart.getMonth() + 1}/${effectiveStart.getDate()}&#x200B; - &#x200B;${effectiveEnd.getMonth() + 1}/${effectiveEnd.getDate()}` // For header
                });
                totalWeeks++; // Increment totalWeeks for every calendar week within project duration
            }

            currentWeekStart.setDate(currentWeekStart.getDate() + 7); // Move to the next week
        }

        allWeeksDataGlobal = allWeeksData; // Store for addResourceRow

        // Update manDays for existing resources based on new week data
        currentTableResources.forEach(resource => {
            resource.manDays = allWeeksDataGlobal.map(week => week.workingDays);
        });

        // Generate Week Headers
        allWeeksData.forEach(weekInfo => {
            weekHeaders += `<th scope="col" class="weekly-header">W${weekInfo.week}<br>(${weekInfo.displayRange})<br>${weekInfo.workingDays}天</th>`;
        });

        // Add headers for calculation columns
        const calculationHeaders = '<th scope="col" rowspan="2">小计 (人天)</th><th scope="col" rowspan="2">单价</th><th scope="col" rowspan="2">总价</th><th scope="col" rowspan="2">备注</th>';
        tableHTML += `<tr><th scope="col" rowspan="2">顾问资源</th>${weekHeaders}${calculationHeaders}</tr>`;
        tableHTML += `</thead><tbody>`;

        // Generate rows based on currentTableResources
        currentTableResources.forEach((resource, rowIndex) => {
            tableHTML += generateResourceRow(rowIndex, resource.type, totalWeeks, allWeeksDataGlobal, resource);
        });

        tableHTML += `<tr><td class="sticky-total-cell"><strong>总计</strong></td>`; // First cell for "总计"
        // Loop for weekly totals
        for (let j = 0; j < totalWeeks; j++) {
            tableHTML += `<td class="grand-total-week-manday" id="grand-total-week-${j}">0</td>`;
        }
        tableHTML += `<td class="grand-subtotal-manday" id="grand-subtotal-manday-total">0</td>`; // Grand total man-day for subtotal column
        tableHTML += `<td></td>`; // Empty cell under Unit Price
        tableHTML += `<td class="grand-total-price" id="grand-total-price-total">0</td>`; // Grand total price for total price column
        tableHTML += `<td><input type="text" class="remarks-input" data-row="total"></td>`; // Remarks cell
        tableHTML += '</tr></tbody></table>';

        tableContainer.innerHTML = tableHTML;
        setupEventListeners();
        updateTotals();
    }

    function generateResourceRow(rowIndex, initialResourceName, totalWeeks, allWeeksData = null, resourceData = null) {
        let rowHTML = `<tr data-row-index="${rowIndex}">`;
        rowHTML += `<td class="phase-bar">
            <button class="delete-row-btn" data-row="${rowIndex}">-</button>
            <select class="resource-select" data-row="${rowIndex}" style="display: ${resourceData && resourceData.isCustomVisible ? 'none' : 'block'};">
                ${resourceOptions.map(option => `<option value="${option}" ${initialResourceName === option ? 'selected' : ''}>${option}</option>`).join('')}
            </select>
            <input type="text" class="custom-resource-input" placeholder="输入顾问类型" data-row="${rowIndex}" style="display: ${resourceData && resourceData.isCustomVisible ? 'block' : 'none'};" value="${resourceData ? resourceData.customType : ''}">
        </td>`;

        for (let j = 0; j < totalWeeks; j++) {
            let manDayValue = '0';
            if (resourceData && resourceData.manDays && resourceData.manDays[j] !== undefined) {
                manDayValue = resourceData.manDays[j];
            } else if (allWeeksData && allWeeksData[j]) {
                manDayValue = allWeeksData[j].workingDays;
            }
            rowHTML += `<td><input type="number" class="man-day-input" min="0" step="0.1" value="${manDayValue}" data-row="${rowIndex}" data-week="${j}"></td>`;
        }

        rowHTML += `<td class="subtotal" id="subtotal-${rowIndex}">0</td>`;
        rowHTML += `<td><input type="number" class="unit-price-input" value="${resourceData ? resourceData.unitPrice : '3000'}" min="0" data-row="${rowIndex}"></td>`;
        rowHTML += `<td class="total-price" id="total-price-${rowIndex}">0</td>`;
        rowHTML += `<td><input type="text" class="remarks-input" data-row="${rowIndex}" value="${resourceData ? resourceData.remarks : ''}"></td>`;
        rowHTML += '</tr>';
        return rowHTML;
    }

    function addResourceRow() {
        const tableBody = tableContainer.querySelector('tbody');
        if (!tableBody) {
            alert('请先生成表格！');
            return;
        }
        const existingRows = tableBody.querySelectorAll('tr').length;
        const newRowIndex = currentTableResources.length; // New index for the added row
        const totalWeeks = allWeeksDataGlobal.length; // Use global totalWeeks

        // Create a new resource object for the added row
        const newResource = {
            type: resourceOptions[0], // Default to first option
            customType: '',
            manDays: allWeeksDataGlobal.map(week => week.workingDays), // Initialize manDays with calculated workingDays
            unitPrice: '3000',
            remarks: '',
            isCustomVisible: false
        };
        currentTableResources.push(newResource); // Add to our data model

        const newRowHTML = generateResourceRow(newRowIndex, newResource.type, totalWeeks, allWeeksDataGlobal, newResource);
        const totalRow = tableBody.querySelector('tr:last-child');
        totalRow.insertAdjacentHTML('beforebegin', newRowHTML);
        setupRowEventListeners(tableBody.querySelector(`tr[data-row-index="${newRowIndex}"]`));
        updateTotals();
        saveTableData();
        
        // 显示调整资源的提示
        console.log('Calling showAdjustResourceNotification');
        showAdjustResourceNotification();
    }

    function updateTotals() {
        let grandTotalManDay = 0;
        let grandTotalPrice = 0;
        const resourceRows = tableContainer.querySelectorAll('tbody tr:not(:last-child)');

        // Initialize weekly totals array
        const firstResourceRow = resourceRows[0];
        const numberOfWeeks = firstResourceRow ? firstResourceRow.querySelectorAll('.man-day-input').length : 0;
        const weeklyTotals = Array(numberOfWeeks).fill(0);

        resourceRows.forEach(row => {
            const rowIndex = row.dataset.rowIndex;
            let rowSubtotal = 0;
            row.querySelectorAll('.man-day-input').forEach((input, weekIndex) => {
                const manDayValue = parseFloat(input.value) || 0;
                rowSubtotal += manDayValue;
                weeklyTotals[weekIndex] += manDayValue; // Accumulate for weekly total
            });
            const unitPrice = parseFloat(row.querySelector('.unit-price-input').value) || 0;
            const rowTotalPrice = rowSubtotal * unitPrice;
            row.querySelector(`#subtotal-${rowIndex}`).textContent = rowSubtotal.toFixed(1);
            row.querySelector(`#total-price-${rowIndex}`).textContent = rowTotalPrice.toFixed(2);
            grandTotalManDay += rowSubtotal;
            grandTotalPrice += rowTotalPrice;
        });

        // Update weekly total cells
        weeklyTotals.forEach((total, index) => {
            const weekTotalCell = document.getElementById(`grand-total-week-${index}`);
            if (weekTotalCell) {
                weekTotalCell.textContent = total.toFixed(1);
            }
        });

        // Update grand totals
        const grandSubtotalManDayCell = document.getElementById('grand-subtotal-manday-total');
        if (grandSubtotalManDayCell) {
            grandSubtotalManDayCell.textContent = grandTotalManDay.toFixed(1);
        }
        const grandTotalPriceCell = document.getElementById('grand-total-price-total');
        if (grandTotalPriceCell) {
            grandTotalPriceCell.textContent = grandTotalPrice.toFixed(2);
        }
    }

    function handleResourceChange(event) {
        const selectElement = event.target;
        const selectedValue = selectElement.value;
        const rowIndex = selectElement.dataset.row;
        const customInput = tableContainer.querySelector(`.custom-resource-input[data-row="${rowIndex}"]`);
        if (customInput) {
            if (selectedValue === '自定义') {
                customInput.style.display = 'block';
                selectElement.style.display = 'none';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
                selectElement.style.display = 'block';
                customInput.value = '';
            }
        }
    }

    function setupEventListeners() {
        tableContainer.addEventListener('input', (event) => {
            const target = event.target;
            if (target.classList.contains('man-day-input') || target.classList.contains('unit-price-input') || target.classList.contains('remarks-input') || target.classList.contains('custom-resource-input')) {
                updateTotals();
                saveTableData();
            }
        });
        tableContainer.addEventListener('change', (event) => {
            if (event.target.classList.contains('resource-select')) {
                handleResourceChange(event);
                saveTableData();
            }
        });
        tableContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-row-btn')) {
                const rowIndex = event.target.dataset.row;
                const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
                if (row) {
                    row.remove();
                    updateTotals();
                    saveTableData();
                }
            }
        });
    }

    function setupRowEventListeners(rowElement) {
        // Event delegation handles this now.
    }

    function saveTableData() {
        const tableData = {
            resources: currentTableResources, // Save currentTableResources
            year: projectYearInput.value,
            month: startMonthInput.value,
            duration: projectDurationInput.value,
            holidays: Array.from(holidaysSet), // Save as array
            workdays: Array.from(workdaysSet)   // Save as array
        };
        localStorage.setItem('projectResourceData', JSON.stringify(tableData));
    }

    function loadTableData() {
        const savedData = localStorage.getItem('projectResourceData');
        if (savedData) {
            const tableData = JSON.parse(savedData);
            projectYearInput.value = tableData.year || new Date().getFullYear();
            startMonthInput.value = tableData.month || new Date().getMonth() + 1;
            projectDurationInput.value = tableData.duration || 1;

            // Load dates and update UI
            holidaysSet.clear(); // Clear existing set
            (tableData.holidays || []).forEach(date => holidaysSet.add(date));
            workdaysSet.clear(); // Clear existing set
            (tableData.workdays || []).forEach(date => workdaysSet.add(date));

            // Load resources
            currentTableResources = tableData.resources || [];

            // Set Flatpickr dates from loaded data
            holidaysPicker._flatpickr.setDate(Array.from(holidaysSet), true);
            workdaysPicker._flatpickr.setDate(Array.from(workdaysSet), true);

            // IMPORTANT: Do not generate the table on load.
            // The user must click the button to generate the table.

        } else {
            // Set default year/month if no saved data, but do not generate the table.
            const currentDate = new Date();
            projectYearInput.value = currentDate.getFullYear();
            startMonthInput.value = currentDate.getMonth() + 1;
            projectDurationInput.value = 1;
            currentTableResources = defaultResources.map(name => ({ // Initialize with default resources
                type: name,
                customType: '',
                manDays: [],
                unitPrice: '3000',
                remarks: '',
                isCustomVisible: false
            }));
        }
    }

    async function exportToExcel() {
        const table = tableContainer.querySelector('table');
        if (!table) {
            alert('请先生成表格！');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('人天费用评估');

        // --- 1. Define Reusable Styles ---
        const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const headerStyle = {
            font: { bold: true, color: { argb: 'FF000000' } }, // Black font for light background
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D5' } }, // Light Green
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            border: thinBorder
        };
        const totalStyle = {
            font: { bold: true },
            alignment: { horizontal: 'center' },
            border: thinBorder
        };
        const cellStyle = {
            border: thinBorder,
            alignment: { vertical: 'middle' } // Base style for all cells
        };

        // --- 2. Build Header Rows ---
        const headerRow1 = worksheet.getRow(1);
        const headerRow2 = worksheet.getRow(2);
        headerRow1.height = 20;
        headerRow2.height = 40;

        const headerTexts1 = ['顾问资源'];
        const headerTexts2 = [null];
        allWeeksDataGlobal.forEach(weekInfo => {
            headerTexts1.push(`W${weekInfo.week}`);
            const displayRange = weekInfo.displayRange.replace(/&#x200B;/g, '');
            headerTexts2.push(`(${displayRange})
${weekInfo.workingDays}天`);
        });
        const calcHeaders = ['小计 (人天)', '单价', '总价', '备注'];
        calcHeaders.forEach(text => {
            headerTexts1.push(text);
            headerTexts2.push(null);
        });

        headerTexts1.forEach((text, i) => {
            const cell1 = headerRow1.getCell(i + 1);
            cell1.value = text;
            cell1.style = headerStyle;
            const cell2 = headerRow2.getCell(i + 1);
            cell2.value = headerTexts2[i];
            cell2.style = headerStyle;
        });

        // --- 3. Apply Merges ---
        worksheet.mergeCells('A1:A2');
        const calcHeaderStartIndex = 1 + allWeeksDataGlobal.length;
        calcHeaders.forEach((_, i) => {
            const colLetter = worksheet.getColumn(calcHeaderStartIndex + i + 1).letter;
            worksheet.mergeCells(`${colLetter}1:${colLetter}2`);
        });

        // --- 4. Build Body Rows ---
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach((row, rowIndex) => {
            const currentRow = worksheet.getRow(rowIndex + 3);
            const isTotalRow = row.querySelector('strong') && row.querySelector('strong').innerText === '总计';

            row.querySelectorAll('td').forEach((cell, cellIndex) => {
                const currentCell = currentRow.getCell(cellIndex + 1);
                let value;

                // Extract value from input or text
                const input = cell.querySelector('input, select');
                if (cellIndex === 0) { // Special handling for the first column (resource name)
                    const resourceSelect = cell.querySelector('.resource-select');
                    const customInput = cell.querySelector('.custom-resource-input');
                    if (customInput && customInput.style.display === 'block') {
                        value = customInput.value.trim();
                    } else if (resourceSelect) {
                        value = resourceSelect.value;
                    } else {
                        value = cell.innerText.trim(); // For "总计" row
                    }
                } else if (input) {
                    if (input.tagName === 'SELECT') {
                        value = input.value;
                    } else if (input.style.display !== 'none') {
                        value = input.value;
                    } else {
                        value = cell.innerText.trim();
                    }
                } else {
                    value = cell.innerText.trim();
                }

                // Convert to number if possible
                currentCell.value = !isNaN(parseFloat(value)) ? parseFloat(value) : value;

                // Apply styles
                if (isTotalRow) {
                    currentCell.style = totalStyle;
                } else {
                    currentCell.style = cellStyle;
                }

                // Center-align numbers
                if (typeof currentCell.value === 'number') {
                    currentCell.alignment = { ...currentCell.alignment, horizontal: 'center' };
                }
            });
        });

        // --- 5. Adjust Column Widths and Final Touches ---
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const cellLength = cell.value ? cell.value.toString().length : 0;
                maxLength = Math.max(maxLength, cellLength);
            });
            column.width = Math.max(12, maxLength + 3);
        });

        // --- 6. Save File ---
        // Add holidays and workdays as remarks
        const lastRow = worksheet.lastRow.number;
        const remarksRowIndex = lastRow + 3; // Two empty rows + 1 for the new content

        const holidaysText = Array.from(holidaysSet).sort().join('、');
        const workdaysText = Array.from(workdaysSet).sort().join('、');

        // Add "备注：" header
        const generalRemarksCell = worksheet.getCell(`A${remarksRowIndex - 1}`);
        generalRemarksCell.value = '备注：';
        generalRemarksCell.font = { bold: true };
        generalRemarksCell.alignment = { wrapText: true };
        worksheet.mergeCells(`A${remarksRowIndex - 1}:F${remarksRowIndex - 1}`);

        if (holidaysText) {
            const holidaysRemarkCell = worksheet.getCell(`A${remarksRowIndex}`);
            holidaysRemarkCell.value = `法定节假日: ${holidaysText}`;
            holidaysRemarkCell.font = { bold: true };
            holidaysRemarkCell.alignment = { wrapText: true };
            worksheet.mergeCells(`A${remarksRowIndex}:F${remarksRowIndex}`); // Merge across several columns
        }

        if (workdaysText) {
            const workdaysRemarkCell = worksheet.getCell(`A${remarksRowIndex + (holidaysText ? 1 : 0)}`);
            workdaysRemarkCell.value = `调休工作日: ${workdaysText}`;
            workdaysRemarkCell.font = { bold: true };
            workdaysRemarkCell.alignment = { wrapText: true };
            worksheet.mergeCells(`A${remarksRowIndex + (holidaysText ? 1 : 0)}:F${remarksRowIndex + (holidaysText ? 1 : 0)}`); // Merge across several columns
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, '人天费用评估.xlsx');
    }

    // --- Initial Setup ---
    // Helper function to adjust input width based on content
    function adjustInputWidth(inputElement, text) {
        // Create a temporary span to measure text width
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'nowrap';
        span.style.font = getComputedStyle(inputElement).font; // Match font styles
        span.textContent = text;
        document.body.appendChild(span);

        // Calculate width including padding and border
        const padding = parseFloat(getComputedStyle(inputElement).paddingLeft) + parseFloat(getComputedStyle(inputElement).paddingRight);
        const border = parseFloat(getComputedStyle(inputElement).borderLeftWidth) + parseFloat(getComputedStyle(inputElement).borderRightWidth);
        const newWidth = span.offsetWidth + padding + border + 2; // Add a small buffer

        inputElement.style.width = `${newWidth}px`;
        document.body.removeChild(span);
    }

    // 添加一个函数来显示重新生成表格的提示
    function showRegenerateTableNotification() {
        // 检查表格是否已经存在
        const tableExists = tableContainer.querySelector('table');
        if (tableExists) {
            // 创建或获取通知元素
            let notification = document.getElementById('regenerate-notification');
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'regenerate-notification';
                notification.className = 'notification';
                notification.innerHTML = '日期已更新，请点击 <strong>生成/更新表格</strong> 按钮重新计算工作日！';

                // 添加关闭按钮
                const closeBtn = document.createElement('span');
                closeBtn.className = 'close-notification';
                closeBtn.innerHTML = '&times;';
                closeBtn.onclick = function () {
                    notification.style.display = 'none';
                };
                notification.appendChild(closeBtn);

                // 插入到表格容器前面
                tableContainer.parentNode.insertBefore(notification, tableContainer);
            } else {
                // 如果通知已存在，确保它是可见的
                notification.style.display = 'block';
            }

            // 高亮生成表格按钮
            generateTableBtn.classList.add('highlight-button');

            // 5秒后自动隐藏通知
            setTimeout(() => {
                if (notification) notification.style.display = 'none';
                generateTableBtn.classList.remove('highlight-button');
            }, 5000);
        }
    }

    // 添加一个函数来显示调整资源的提示
    function showAdjustResourceNotification() {
        console.log('showAdjustResourceNotification called');
        // 创建或获取通知元素
        let notification = document.getElementById('adjust-resource-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'adjust-resource-notification';
            notification.className = 'notification';
            notification.innerHTML = '已添加新的资源行，请根据实际需求调整 <strong>顾问资源类型</strong> 和 <strong>单价</strong>！';
            
            // 添加关闭按钮
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close-notification';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = function() {
                notification.style.display = 'none';
            };
            notification.appendChild(closeBtn);
            
            // 插入到表格容器前面
            tableContainer.parentNode.insertBefore(notification, tableContainer);
        } else {
            // 如果通知已存在，确保它是可见的
            notification.style.display = 'block';
        }
        
        // 4秒后自动隐藏通知
        setTimeout(() => {
            if (notification) notification.style.display = 'none';
        }, 4000);
    }

    // Initialize Flatpickr for holidays
    flatpickr(holidaysPicker, {
        mode: "multiple",
        dateFormat: "Y-m-d",
        onChange: function (selectedDates, dateStr, instance) {
            holidaysSet.clear();
            selectedDates.forEach(date => holidaysSet.add(flatpickr.formatDate(date, "Y-m-d")));
            updateDateList(holidaysSet, holidaysList);
            saveTableData();
            adjustInputWidth(holidaysPicker, dateStr); // Adjust width dynamically
            showRegenerateTableNotification(); // 显示重新生成表格的提示
        }
    });

    // Initialize Flatpickr for workdays
    flatpickr(workdaysPicker, {
        mode: "multiple",
        dateFormat: "Y-m-d",
        onChange: function (selectedDates, dateStr, instance) {
            workdaysSet.clear();
            selectedDates.forEach(date => workdaysSet.add(flatpickr.formatDate(date, "Y-m-d")));
            updateDateList(workdaysSet, workdaysList);
            saveTableData();
            adjustInputWidth(workdaysPicker, dateStr); // Adjust width dynamically
            showRegenerateTableNotification(); // 显示重新生成表格的提示
        }
    });

    generateTableBtn.addEventListener('click', () => {
        generateTable();
        saveTableData();

        // 隐藏通知
        const notification = document.getElementById('regenerate-notification');
        if (notification) {
            notification.style.display = 'none';
        }

        // 移除按钮高亮
        generateTableBtn.classList.remove('highlight-button');
    });
    addRowBtn.addEventListener('click', addResourceRow);
    exportBtn.addEventListener('click', exportToExcel);

    // Auto-save on main control changes
    [projectYearInput, startMonthInput, projectDurationInput].forEach(input => {
        input.addEventListener('change', saveTableData);
    });

    loadTableData();
});


console.log('script.js fully executed');