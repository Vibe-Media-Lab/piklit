export const copyToClipboard = async (title, htmlContent) => {
    try {
        // 1. Clean HTML for Naver Blog SmartEditor ONE
        // - Ensure <p> has breaks or margins
        // - Remove internal Tiptap classes
        let cleanInfo = htmlContent;

        // 이미지를 [사진 추가] 플레이스홀더로 교체 (사용자가 직접 업로드)
        cleanInfo = cleanInfo.replace(/<img[^>]*>/gi, '<p style="text-align:center; color:#999; font-size:0.95em; padding:12px 0;">[사진 추가]</p>');

        // Remove Tiptap class attributes
        cleanInfo = cleanInfo.replace(/class="[^"]*"/g, '');

        // Add explicit styling for consistent paste
        // Naver Blog uses <div> or <p> with specific styles often, but clean semantic HTML is best.
        // We wrap standard tags with inline styles to ensure appearance preservation.

        cleanInfo = cleanInfo
            .replace(/<p>/g, '<p style="margin-bottom: 0.8em; line-height: 1.8;">')
            .replace(/<h2>/g, '<h2 style="margin-top: 1.5em; margin-bottom: 1em; font-size: 1.5em; color: #333;">')
            .replace(/<h3>/g, '<h3 style="margin-top: 1.2em; margin-bottom: 0.8em; font-size: 1.2em;">');

        // 2. Construct Final HTML
        const fullHtml = `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #333;">
        <h1 style="font-size: 2em; font-weight: bold; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px;">${title}</h1>
        ${cleanInfo}
        <br/><br/>
        <p style="color: #888; font-size: 0.8em; border-top: 1px solid #eee; padding-top: 20px;">
           Written with <a href="#" style="color: #888; text-decoration: none;">Naver Blog Editor AI</a>
        </p>
      </div>
    `;

        // 3. Create ClipboardItem
        const type = "text/html";
        const blob = new Blob([fullHtml], { type });
        const textBlob = new Blob([docToText(title, htmlContent)], { type: 'text/plain' });

        const data = [new ClipboardItem({
            [type]: blob,
            'text/plain': textBlob
        })];

        await navigator.clipboard.write(data);
        return true;
    } catch (err) {
        console.error('Failed to copy: ', err);
        return false;
    }
};

// Helper for plain text fallback
const docToText = (title, html) => {
    const tempDiv = document.createElement('div');
    // 이미지를 [사진 추가]로 치환 후 텍스트 추출
    tempDiv.innerHTML = html.replace(/<img[^>]*>/gi, '[사진 추가]\n');
    return `${title}\n\n${tempDiv.textContent}`;
};

// 공통 헬퍼: Blob 다운로드
const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// HTML → Markdown 자체 변환 (외부 라이브러리 없이)
export const exportAsMarkdown = (title, html) => {
    let md = html;
    // H2 → ##
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => `\n## ${inner.replace(/<[^>]*>/g, '').trim()}\n`);
    // H3 → ###
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => `\n### ${inner.replace(/<[^>]*>/g, '').trim()}\n`);
    // strong/b → **
    md = md.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**');
    // em/i → *
    md = md.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*');
    // img → ![alt](src)
    md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');
    // a → [텍스트](url)
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
    // ul/ol/li
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');
    // blockquote
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
        const text = inner.replace(/<[^>]*>/g, '').trim();
        return `\n> ${text}\n`;
    });
    // hr
    md = md.replace(/<hr[^>]*>/gi, '\n---\n');
    // p → paragraph with newline
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
    // br → newline
    md = md.replace(/<br\s*\/?>/gi, '\n');
    // 남은 HTML 태그 제거
    md = md.replace(/<[^>]*>/g, '');
    // 연속 빈줄 정리
    md = md.replace(/\n{3,}/g, '\n\n').trim();

    const content = `# ${title}\n\n${md}`;
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_') || 'blog-post';
    downloadFile(content, `${safeTitle}.md`, 'text/markdown;charset=utf-8');
};

// 완전한 HTML5 문서 생성 + 다운로드
export const exportAsHtml = (title, html) => {
    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.8; }
h1 { font-size: 2em; border-bottom: 2px solid #333; padding-bottom: 10px; }
h2 { margin-top: 1.5em; color: #333; }
h3 { margin-top: 1.2em; }
p { margin-bottom: 0.8em; }
img { max-width: 100%; border-radius: 8px; margin: 10px 0; }
blockquote { border-left: 4px solid #6c5ce7; background: #f8f7ff; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
</style>
</head>
<body>
<h1>${title}</h1>
${html}
</body>
</html>`;
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_') || 'blog-post';
    downloadFile(fullHtml, `${safeTitle}.html`, 'text/html;charset=utf-8');
};

// 텍스트 내보내기
export const exportAsText = (title, html) => {
    const text = docToText(title, html);
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_') || 'blog-post';
    downloadFile(text, `${safeTitle}.txt`, 'text/plain;charset=utf-8');
};
