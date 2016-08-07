'use strict';

function leftpad(str, len) {
    var i = -1;
    len = len - str.length;
    while (++i < len) {
        str = ' ' + str;
    }
    return str;
}

function formatCells(cells) {
    if (cells.length === 0) {
        return '';
    }
    let line = '  ';
    let label = cells.shift();
    line += leftpad(label.Value, 35);
    cells.forEach(function(cell) {
        line += leftpad(cell.Value, 15);
    });
    return line;
}

function basicRow(row) {
    return formatCells(row.Cells);
}

let formaters = {
    Header: basicRow,
    Section: function(row) {
        return '\n' + row.Title + '\n' +
            row.Rows.map(formatRow).join('\n');
    },
    Row: basicRow,
    SummaryRow: basicRow
};

function formatRow(row) {
    return formaters[row.RowType](row);
}

function formatReport(rep) {
    let text = '';
    rep.ReportTitles.forEach(function(title) {
        text += title + '\n';
    });
    text += '\n';
    text += rep.Rows.map(formatRow).join('\n');
    return text;
}

module.exports = formatReport;
