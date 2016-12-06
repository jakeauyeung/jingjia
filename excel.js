/*
    Helpers for extracting excel files
*/
var XLSX = require('xlsx');

exports.sheet_to_array = function(sheet) {
    var out = [], txt = "";
    if(sheet == null || sheet["!ref"] == null) return "";
    var r = safe_decode_range(sheet["!ref"]);
    var row = [], rr = "", cols = [];
    var i = 0, cc = 0, val;
    var R = 0, C = 0;
    for(C = r.s.c; C <= r.e.c; ++C) cols[C] = XLSX.utils.encode_col(C);
    for(R = r.s.r; R <= r.e.r; ++R) {
        row = [];
        rr = XLSX.utils.encode_row(R);
        for(C = r.s.c; C <= r.e.c; ++C) {
            val = sheet[cols[C] + rr];
            txt = val !== undefined ? ''+XLSX.utils.format_cell(val) : "";
            row.push(txt);
        }
        out.push(row);
    }
    return out;
}

// from XLSX utils...
function safe_decode_range(range) {
    var o = {s:{c:0,r:0},e:{c:0,r:0}};
    var idx = 0, i = 0, cc = 0;
    var len = range.length;
    for(idx = 0; i < len; ++i) {
        if((cc=range.charCodeAt(i)-64) < 1 || cc > 26) break;
        idx = 26*idx + cc;
    }
    o.s.c = --idx;
    for(idx = 0; i < len; ++i) {
        if((cc=range.charCodeAt(i)-48) < 0 || cc > 9) break;
        idx = 10*idx + cc;
    }
    o.s.r = --idx;
    if(i === len || range.charCodeAt(++i) === 58) { o.e.c=o.s.c; o.e.r=o.s.r; return o; }
    for(idx = 0; i != len; ++i) {
        if((cc=range.charCodeAt(i)-64) < 1 || cc > 26) break;
        idx = 26*idx + cc;
    }
    o.e.c = --idx;
    for(idx = 0; i != len; ++i) {
        if((cc=range.charCodeAt(i)-48) < 0 || cc > 9) break;
        idx = 10*idx + cc;
    }
    o.e.r = --idx;
    return o;
}