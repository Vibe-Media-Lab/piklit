import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const LongSentenceExtension = Extension.create({
    name: 'longSentence',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('longSentence'),
                props: {
                    decorations: ({ doc }) => {
                        const decorations = [];

                        doc.descendants((node, pos) => {
                            if (node.isText) {
                                const text = node.text;
                                // Simple splitting by sentence enders.
                                // Note: accurate sentence splitting is hard, this is a heuristic.
                                const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

                                let currentOffset = 0;
                                sentences.forEach(sentence => {
                                    if (sentence.length > 80) { // Naver SEO prefers short sentences
                                        const from = pos + currentOffset;
                                        const to = from + sentence.length;

                                        decorations.push(
                                            Decoration.inline(from, to, {
                                                class: 'long-sentence-warning',
                                                'data-warning': '문장이 너무 깁니다 (80자 이상). 가독성을 위해 나누어주세요.'
                                            })
                                        );
                                    }
                                    currentOffset += sentence.length;
                                });
                            }
                        });

                        return DecorationSet.create(doc, decorations);
                    },
                },
            }),
        ];
    },
});
