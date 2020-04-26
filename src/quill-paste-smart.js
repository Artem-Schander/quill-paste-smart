import Quill from 'quill';
import DOMPurify from 'dompurify';

const Delta = Quill.import('delta');
const Clipboard = Quill.import('modules/clipboard');

class TidyClipboard extends Clipboard {
    static keepSelection = false;
    static allowed = [];

    constructor(quill, options) {
        super(quill, options);

        this.allowed = options.allowed;
        this.keepSelection = options.keepSelection;
    }

    onPaste(e) {
        e.preventDefault();

        let tidy = this.getAllowed();

        const dirty = e.clipboardData.getData('text/html');
        const clean = DOMPurify.sanitize(dirty, tidy);
        const paste = this.convert(clean);

        const range = this.quill.getSelection();

        // delete selected content
        let delta = new Delta().retain(range.index);
        delta = delta.delete(range.length);
        this.quill.updateContents(delta, Quill.sources.USER);

        // insert fresh content
        this.quill.updateContents(new Delta().retain(range.index).concat(paste), Quill.sources.API);

        // move cursor
        if (this.keepSelection) this.quill.setSelection(range.index, paste.length(), Quill.sources.SILENT);
        else this.quill.setSelection(range.index + paste.length(), Quill.sources.SILENT);

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
                            if (control[1].value === '1') {
                                tidy.ALLOWED_TAGS.push('h1');
                            } else if (control[1].value === '2') {
                                tidy.ALLOWED_TAGS.push('h2');
                            } else if (control[1].value === '3') {
                                tidy.ALLOWED_TAGS.push('h3');
                            } else if (control[1].value === '4') {
                                tidy.ALLOWED_TAGS.push('h4');
                            } else if (control[1].value === '5') {
                                tidy.ALLOWED_TAGS.push('h5');
                            } else if (control[1].value === '6') {
                                tidy.ALLOWED_TAGS.push('h6');
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

// Quill.register('modules/clipboard', TidyClipboard, true);
export default TidyClipboard;
