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
