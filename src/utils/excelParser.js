/**
 * 네이버 블로그 통계 엑셀 파서
 * read-excel-file을 dynamic import로 로드하여 번들 사이즈 최소화
 *
 * 네이버 엑셀 포맷:
 * - 1~6행: 메타데이터 (블로그명, 기간, 데이터 단위 등)
 * - 7행: 빈 행
 * - 8행: 헤더 (순위, 제목, 조회수, 발행일 등)
 * - 9행~: 데이터
 */

let _readXlsx = null;

async function loadReader() {
    if (!_readXlsx) {
        const mod = await import('read-excel-file/browser');
        _readXlsx = mod.default;
    }
    return _readXlsx;
}

/**
 * 메타데이터에서 데이터 단위(일간/주간/월간)와 기간 추출
 */
function extractMeta(rows) {
    const meta = { unit: '알 수 없음', period: '' };

    // 1~6행에서 메타정보 탐색
    for (let r = 0; r < Math.min(6, rows.length); r++) {
        for (let c = 0; c < Math.min(5, rows[r].length); c++) {
            const val = String(rows[r][c] || '');

            if (val.includes('일간')) meta.unit = '일간';
            else if (val.includes('주간')) meta.unit = '주간';
            else if (val.includes('월간')) meta.unit = '월간';

            // 기간 패턴: 2025.01.01 ~ 2025.01.31 또는 유사 형태
            const periodMatch = val.match(/\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*[~\-]\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}/);
            if (periodMatch) meta.period = periodMatch[0];
        }
    }

    return meta;
}

/**
 * 헤더 행에서 컬럼 인덱스 매핑
 * 네이버 통계 컬럼: 순위, 게시글 제목, 조회수, 발행일 등
 */
function mapHeaders(row) {
    const mapping = { rank: -1, title: -1, views: -1, publishDate: -1 };

    for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();

        if (val.includes('순위') || val === 'No' || val === 'no') mapping.rank = c;
        else if (val.includes('제목') || val.includes('게시글')) mapping.title = c;
        else if (val.includes('조회') || val.includes('뷰')) mapping.views = c;
        else if (val.includes('발행') || val.includes('작성') || val.includes('날짜') || val.includes('등록')) mapping.publishDate = c;
    }

    return mapping;
}

/**
 * 엑셀 파일을 파싱하여 블로그 통계 데이터 반환
 * @param {File} file - 업로드된 엑셀 파일
 * @returns {Promise<{period: string, unit: string, data: Array}>}
 */
export async function parseNaverBlogStats(file) {
    const readXlsxFile = await loadReader();
    const rows = await readXlsxFile(file);

    if (!rows || rows.length === 0) {
        throw new Error('엑셀 파일에서 시트를 찾을 수 없습니다.');
    }

    // 메타데이터 추출
    const meta = extractMeta(rows);

    // 헤더 행 탐색 (보통 8행 = index 7, 하지만 유연하게 5~15행 탐색)
    let headerRow = -1;
    let colMap = null;

    for (let r = 4; r < Math.min(15, rows.length); r++) {
        const testMap = mapHeaders(rows[r]);
        // 제목과 조회수 컬럼이 최소한 있으면 헤더로 인정
        if (testMap.title >= 0 && testMap.views >= 0) {
            headerRow = r;
            colMap = testMap;
            break;
        }
    }

    if (headerRow < 0 || !colMap) {
        throw new Error('네이버 블로그 통계 형식을 인식할 수 없습니다. 제목과 조회수 컬럼을 찾지 못했습니다.');
    }

    // 데이터 행 파싱 (헤더 다음 행부터)
    const data = [];

    for (let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r];
        const title = colMap.title >= 0 ? row[colMap.title] : null;
        if (!title) continue; // 빈 행 스킵

        const views = colMap.views >= 0 ? Number(row[colMap.views]) || 0 : 0;
        const rank = colMap.rank >= 0 ? Number(row[colMap.rank]) || data.length + 1 : data.length + 1;
        const publishDate = colMap.publishDate >= 0 ? String(row[colMap.publishDate] || '') : '';

        data.push({ rank, title: String(title), views, publishDate });
    }

    if (data.length === 0) {
        throw new Error('엑셀에서 데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.');
    }

    return {
        period: meta.period,
        unit: meta.unit,
        data,
    };
}
