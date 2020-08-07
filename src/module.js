let Quill = window.Quill;
if (!Quill) Quill = require('quill');

const DOMPurify = require('dompurify');

const Delta = Quill.import('delta');
const Clipboard = Quill.import('modules/clipboard');

class QuillPasteSmart extends Clipboard {
    static keepSelection = false;
    static allowed = [];

    constructor(quill, options) {
        super(quill, options);

        this.allowed = options.allowed;
        this.keepSelection = options.keepSelection;
    }

    onPaste(e) {
        e.preventDefault();
        const range = this.quill.getSelection();

        const text = e.clipboardData.getData('text/plain');
        const html = e.clipboardData.getData('text/html');

        let delta = new Delta().retain(range.index).delete(range.length);

        let content = text;
        if (html) {
            const allowed = this.getAllowed();
            content = DOMPurify.sanitize(html, allowed);
            delta = delta.concat(this.convert(content));
        } else {
            delta = delta.insert(content);
        }

        this.quill.updateContents(delta, Quill.sources.USER);

        // move cursor
        delta = this.convert(content);
        if (this.keepSelection) this.quill.setSelection(range.index, delta.length(), Quill.sources.SILENT);
        else this.quill.setSelection(range.index + delta.length(), Quill.sources.SILENT);

        this.quill.scrollIntoView();
    }

    getAllowed() {
        let tidy = {};

        if (this.allowed && this.allowed.tags) tidy.ALLOWED_TAGS = this.allowed.tags;
        if (this.allowed && this.allowed.attributes) tidy.ALLOWED_ATTR = this.allowed.attributes;

        if (tidy.ALLOWED_TAGS === undefined || tidy.ALLOWED_ATTR === undefined) {
            let undefinedTags = false;
            if (tidy.ALLOWED_TAGS === undefined) {
                undefinedTags = true;
                tidy.ALLOWED_TAGS = ['p', 'br', 'span'];
            }

            let undefinedAttr = false;
            if (tidy.ALLOWED_ATTR === undefined) {
                undefinedAttr = true;
                tidy.ALLOWED_ATTR = ['class'];
            }

            const toolbar = this.quill.getModule('toolbar');
            toolbar.controls.forEach((control) => {
                switch (control[0]) {
                    case 'bold':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('b');
                            tidy.ALLOWED_TAGS.push('strong');
                        }
                        break;

                    case 'italic':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('i');
                        }
                        break;

                    case 'underline':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('u');
                        }
                        break;

                    case 'strike':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('s');
                        }
                        break;

                    case 'color':
                    case 'background':
                        if (undefinedAttr) {
                            tidy.ALLOWED_ATTR.push('style');
                        }
                        break;

                    case 'script':
                        if (undefinedTags) {
                            if (control[1].value === 'super') {
                                tidy.ALLOWED_TAGS.push('sup');
                            } else if (control[1].value === 'sub') {
                                tidy.ALLOWED_TAGS.push('sub');
                            }
                        }
                        break;

                    case 'header':
                        if (undefinedTags) {
                            const detectAllowedHeadingTag = (value) => {
                                if (value === '1') {
                                    tidy.ALLOWED_TAGS.push('h1');
                                } else if (value === '2') {
                                    tidy.ALLOWED_TAGS.push('h2');
                                } else if (value === '3') {
                                    tidy.ALLOWED_TAGS.push('h3');
                                } else if (value === '4') {
                                    tidy.ALLOWED_TAGS.push('h4');
                                } else if (value === '5') {
                                    tidy.ALLOWED_TAGS.push('h5');
                                } else if (value === '6') {
                                    tidy.ALLOWED_TAGS.push('h6');
                                }
                            };

                            if (control[1].value) detectAllowedHeadingTag(control[1].value);
                            else if (control[1].options && control[1].options.length) {
                                [].forEach.call(control[1].options, (option) => {
                                    if (option.value) detectAllowedHeadingTag(option.value);
                                });
                            }
                        }
                        break;

                    case 'code-block':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('pre');
                        }
                        if (undefinedAttr) {
                            tidy.ALLOWED_ATTR.push('spellcheck');
                        }
                        break;

                    case 'list':
                        if (undefinedTags) {
                            if (control[1].value === 'ordered') {
                                tidy.ALLOWED_TAGS.push('ol');
                            } else if (control[1].value === 'bullet') {
                                tidy.ALLOWED_TAGS.push('ul');
                            }
                            tidy.ALLOWED_TAGS.push('li');
                        }
                        break;

                    case 'link':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('a');
                        }
                        if (undefinedAttr) {
                            tidy.ALLOWED_ATTR.push('href');
                            tidy.ALLOWED_ATTR.push('target');
                            tidy.ALLOWED_ATTR.push('rel');
                        }
                        break;

                    case 'image':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('img');
                        }
                        if (undefinedAttr) {
                            tidy.ALLOWED_ATTR.push('src');
                            tidy.ALLOWED_ATTR.push('title');
                            tidy.ALLOWED_ATTR.push('alt');
                        }
                        break;

                    case 'video':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push('iframe');
                        }
                        if (undefinedAttr) {
                            tidy.ALLOWED_ATTR.push('frameborder');
                            tidy.ALLOWED_ATTR.push('allowfullscreen');
                            tidy.ALLOWED_ATTR.push('src');
                        }
                        break;

                    case 'blockquote':
                        if (undefinedTags) {
                            tidy.ALLOWED_TAGS.push(control[0]);
                        }
                        break;
                }
            });
        }

        return tidy;
    }
}

// Quill.register('modules/clipboard', QuillPasteSmart, true);
export default QuillPasteSmart;
