import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ROWS_PER_SIDE = 22;
const ITEMS_PER_PAGE = ROWS_PER_SIDE * 2;
const HINDI_TIME_MAP = { सुबह: 'सुबह', दोपहर: 'दोपहर', शाम: 'शाम' };

function formatDate(date = new Date()) {
    return date.toLocaleDateString('en-GB').replace(/\//g, '.');
}

function parseDeliveryDate(value) {
    if (!value) return new Date();
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date() : value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function paginateForBill(items, page) {
    const reversed = [...items].reverse();
    const start = page * ITEMS_PER_PAGE;
    const pageItems = reversed.slice(start, start + ITEMS_PER_PAGE);
    const rows = [];
    for (let i = 0; i < ROWS_PER_SIDE; i++) {
        const leftItem = pageItems[i];
        const rightItem = pageItems[i + ROWS_PER_SIDE];
        rows.push({
            left: {
                name: leftItem?.name || '',
                amount: leftItem?.amount || '',
                quantity: leftItem ? `${leftItem.quantity} ${leftItem.unit || ''}`.trim() : '',
            },
            right: {
                name: rightItem?.name || '',
                amount: rightItem?.amount || '',
                quantity: rightItem ? `${rightItem.quantity} ${rightItem.unit || ''}`.trim() : '',
            },
        });
    }
    return rows;
}

function buildPageHtml({ billItems, formattedDeliveryDate, hindiDeliveryTime, customerNameHindi, mobileNumbersText, billNumberDisplay }) {
    let tableRows = '';
    for (let idx = 0; idx < ROWS_PER_SIDE; idx++) {
        const row = billItems[idx] || { left: {}, right: {} };
        tableRows += `
            <tr style="height:32px;">
                <td style="border:1px solid #222;text-align:center;width:20%;font-size:18px;">${row.left.name || ''}</td>
                <td style="border:1px solid #222;text-align:center;width:14%;font-size:16px;">${row.left.quantity || ''}</td>
                <td style="border:1px solid #222;text-align:center;width:14%;font-size:14px;">${row.left.amount || ''}</td>
                <td style="border:1px solid #222;width:4%;"></td>
                <td style="border:1px solid #222;text-align:center;width:20%;font-size:18px;">${row.right.name || ''}</td>
                <td style="border:1px solid #222;text-align:center;width:14%;font-size:16px;">${row.right.quantity || ''}</td>
                <td style="border:1px solid #222;text-align:center;width:14%;font-size:14px;">${row.right.amount || ''}</td>
            </tr>
        `;
    }

    return `
        <div style="font-family:DejaVu Sans,Arial,sans-serif;color:#222;width:794px;height:1123px;max-width:794px;margin:0;display:flex;flex-direction:column;padding:16px 20px 14px 20px;box-sizing:border-box;position:relative;background:#fff;">
            <div style="width:100%;display:flex;flex-direction:row;align-items:center;margin-bottom:6px;">
                <div style="border:1px solid #222;padding:10px 12px;width:210px;min-width:210px;font-size:14px;background:#fff;flex-shrink:0;">
                    <div style="display:flex;align-items:center;margin-bottom:12px;">
                        <span style="font-weight:600;white-space:nowrap;margin-right:6px;">Check By:</span>
                    </div>
                    <div style="display:flex;align-items:center;">
                        <span style="font-weight:600;white-space:nowrap;margin-right:6px;">Delivered By:</span>
                    </div>
                </div>
                <div style="flex:1;text-align:center;padding:0 8px;">
                    <div style="font-weight:bold;font-size:22px;color:#222;">! श्री राम जी !!</div>
                    <div style="font-size:15px;color:#222;margin-top:6px;">दिनांक ${formattedDeliveryDate} को ${hindiDeliveryTime} तक देना है।</div>
                </div>
                <div style="width:210px;min-width:210px;flex-shrink:0;text-align:right;font-size:15px;color:#222;">
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:16px;line-height:1.8;margin-bottom:8px;color:#222;padding:2px 4px 4px 4px;min-width:0;">
                <span style="flex:1;min-width:0;white-space:nowrap;overflow:visible;margin-right:8px;">नाम: ${customerNameHindi || ''}</span>
                <span style="white-space:nowrap;flex-shrink:0;">मो. नं. ${mobileNumbersText}</span>
            </div>
            <div style="width:100%;flex:1;display:flex;justify-content:center;">
                <table style="width:95%;border-collapse:collapse;font-size:16px;height:100%;">
                    <thead>
                        <tr>
                            <th style="border:1px solid #222;padding:7px;text-align:center;font-weight:bold;width:20%;">उत्पाद</th>
                            <th style="border:1px solid #222;padding:7px;text-align:center;font-weight:bold;width:14%;">मात्रा</th>
                            <th style="border:1px solid #222;padding:7px;text-align:center;font-weight:bold;width:14%;">राशि</th>
                            <th style="border:1px solid #222;padding:7px;width:4%;"></th>
                            <th style="border:1px solid #222;padding:7px;text-align:center;font-weight:bold;width:20%;">उत्पाद</th>
                            <th style="border:1px solid #222;padding:7px;text-align:center;font-weight:bold;width:14%;">मात्रा</th>
                            <th style="border:1px solid #222;padding:7px;text-align:center;font-weight:bold;width:14%;">राशि</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            <div style="margin-top:12px;border-top:1px solid #aaa;padding-top:7px;font-size:13px;text-align:center;color:#222;">
                <span style="font-weight:bold;font-size:14px;margin-right:6px;">नोट:</span>शेष बचा सामान रविवार को वापस नहीं लिया जाएगा। शेष बचा सामान लाने से पूर्व दुकान पर संपर्क करें। सामान के साथ हिसाब वाली पर्ची लाना अनिवार्य है।
            </div>
        </div>
    `;
}

export async function exportBillPdf({
    items = [],
    billId = null,
    customerName = '',
    customerNameHindi = '',
    customerMobile = '',
    alternateMobile = '',
    deliveryDate = null,
    deliveryTimeHindi = '',
} = {}) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Bill has no items.');
    }

    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const parsedDate = parseDeliveryDate(deliveryDate);
    const formattedDeliveryDate = formatDate(parsedDate);
    const hindiDeliveryTime = HINDI_TIME_MAP[deliveryTimeHindi] || '';
    const mobileNumbersText = [customerMobile, alternateMobile].filter(Boolean).join(' / ');
    const billNumberDisplay = billId ?? '—';

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '794px';
        container.style.height = '1123px';
        container.style.background = '#fff';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);

        const billItems = paginateForBill(items, pageIdx);
        container.innerHTML = buildPageHtml({
            billItems,
            formattedDeliveryDate,
            hindiDeliveryTime,
            customerNameHindi,
            mobileNumbersText,
            billNumberDisplay,
        });

        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        // eslint-disable-next-line no-await-in-loop
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 794,
            windowHeight: 1123,
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        document.body.removeChild(container);
    }

    const billNumberPart = billId ? `bill-${billId}_` : '';
    pdf.save(`${billNumberPart}${customerName || 'guest'}_${formatDate()}.pdf`);
}
