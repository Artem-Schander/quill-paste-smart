import Quill from 'quill';
import DOMPurify from 'dompurify';

const Clipboard = Quill.import('modules/clipboard');
const Delta = Quill.import('delta');

class QuillPasteSmart extends Clipboard {
  constructor(quill, options) {
    super(quill, options);

    this.allowed = options.allowed;
    this.keepSelection = options.keepSelection;
    this.substituteBlockElements = options.substituteBlockElements;
    this.magicPasteLinks = options.magicPasteLinks;
    this.hooks = options.hooks;
    this.handleImagePaste = options.handleImagePaste;
    this.customButtons = options.customButtons;
    this.removeConsecutiveSubstitutionTags = options.removeConsecutiveSubstitutionTags;
  }

  onCapturePaste(e) {
    if (e.defaultPrevented || !this.quill.isEnabled()) return;

    e.preventDefault();

    const range = this.quill.getSelection();
    if (range == null)  return;

    let text = e.clipboardData?.getData('text/plain');
    let html = e.clipboardData?.getData('text/html');
    let file = e.clipboardData?.items?.[0];
    let delta = new Delta().retain(range.index).delete(range.length);

    const DOMPurifyOptions = this.getDOMPurifyOptions();

    let plainText = false;
    let content = text;

    if (
      !html &&
      DOMPurifyOptions.ALLOWED_TAGS.includes('a') &&
      this.isURL(text) && range.length > 0 && this.magicPasteLinks
    ) {
      content = this.quill.getText(range.index, range.length);
      delta = delta.insert(content, {
        link: text,
      });
    } else if (
      !html &&
      DOMPurifyOptions.ALLOWED_TAGS.includes('img') &&
      file && file.kind === 'file' && file.type.match(/^image\//i)
    ) {
      const image = file.getAsFile()

      if (this.handleImagePaste !== undefined) {
        this.handleImagePaste(image);
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.quill.insertEmbed(range.index, 'image', e.target.result)
          // if required, manually update the selection after the file loads
          if (!this.keepSelection) this.quill.setSelection(range.index + 1)
        }
        reader.readAsDataURL(image)
      }
    } else {

      if (!html) {
        plainText = true;
        html = content;
      }

      // add hooks to accessible setttings
      if (typeof this.hooks?.beforeSanitizeElements === 'function') {
        DOMPurify.addHook('beforeSanitizeElements', this.hooks.beforeSanitizeElements);
      }
      if (typeof this.hooks?.uponSanitizeElement === 'function') {
        DOMPurify.addHook('uponSanitizeElement', this.hooks.uponSanitizeElement);
      }
      if (typeof this.hooks?.afterSanitizeElements === 'function') {
        DOMPurify.addHook('afterSanitizeElements', this.hooks.afterSanitizeElements);
      }
      if (typeof this.hooks?.beforeSanitizeAttributes === 'function') {
        DOMPurify.addHook('beforeSanitizeAttributes', this.hooks.beforeSanitizeAttributes);
      }
      if (typeof this.hooks?.uponSanitizeAttribute === 'function') {
        DOMPurify.addHook('uponSanitizeAttribute', this.hooks.uponSanitizeAttribute);
      }
      if (typeof this.hooks?.afterSanitizeAttributes === 'function') {
        DOMPurify.addHook('afterSanitizeAttributes', this.hooks.afterSanitizeAttributes);
      }
      if (typeof this.hooks?.beforeSanitizeShadowDOM === 'function') {
        DOMPurify.addHook('beforeSanitizeShadowDOM', this.hooks.beforeSanitizeShadowDOM);
      }
      if (typeof this.hooks?.uponSanitizeShadowNode === 'function') {
        DOMPurify.addHook('uponSanitizeShadowNode', this.hooks.uponSanitizeShadowNode);
      }
      if (typeof this.hooks?.afterSanitizeShadowDOM === 'function') {
        DOMPurify.addHook('afterSanitizeShadowDOM', this.hooks.afterSanitizeShadowDOM);
      }

      if (plainText) {
        content = DOMPurify.sanitize(html, DOMPurifyOptions);
        delta = delta.insert(content);
      } else {
        if (DOMPurifyOptions.ALLOWED_TAGS.includes('table')) {
          // Convert table headers to cells
          html = this.tableHeadersToCells(html);
        } else {
          // Convert rows and cells to block and inline content 
          html = this.convertTableContent(html);
        }

        if (this.substituteBlockElements !== false) {
          let substitution;
          // html = DOMPurify.sanitize(html, { ...DOMPurifyOptions, ...{ RETURN_DOM: true, WHOLE_DOCUMENT: false } });
          [html, substitution] = this.substitute(html, DOMPurifyOptions);
          content = html.innerHTML;
          if (this.removeConsecutiveSubstitutionTags) {
            content = this.collapseConsecutiveSubstitutionTags(content, substitution);
          }
        } else {
          content = DOMPurify.sanitize(html, DOMPurifyOptions);
        }
        delta = delta.concat(this.convert({ html: content }));
      }
    }

    this.quill.updateContents(delta, Quill.sources.USER);

    if (!plainText) {
      // move cursor
      delta = this.convert({ html: content });
    }

    if (this.keepSelection) this.quill.setSelection(range.index, delta.length(), Quill.sources.SILENT);
    else this.quill.setSelection(range.index + delta.length(), Quill.sources.SILENT);
    this.quill.scrollSelectionIntoView();
    DOMPurify.removeAllHooks();
  }

  collapseConsecutiveSubstitutionTags(html, substitution) {
    // Remove all consecutive occurances of substitution (e.g. <p></p>) from html, include tags with only whitespace
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html');
    const tags = doc.querySelectorAll(substitution);
    let removeNextTag = false;
    tags.forEach(tag => {
      if (!removeNextTag) {
        removeNextTag = true;
        return;
      }

      if (tag.firstChild === null || (tag.firstChild.nodeType === 3 && tag.firstChild.nodeValue.trim() === '')) {
        tag.parentNode.removeChild(tag);
      } else {
        removeNextTag = false;
      }
    });
    return doc.body.innerHTML;
  }

  tableHeadersToCells(html) {
    // Quill table doesn't support header cells
    // Move first <tr> from <thead> to <tbody>, convert all <th> to <td>
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
      // Check if the table has a <thead> element
      const thead = table.querySelector('thead');
      if (thead) {
        // Move the <thead>'s first <tr> child to be the first child of <tbody>
        const tbody = table.querySelector('tbody');
        if (tbody) {
          const firstRow = thead.querySelector('tr');
          tbody.insertBefore(firstRow, tbody.firstChild);
        }
      }
      // Convert all <th> elements to <td> elements
      const thElements = table.querySelectorAll('th');
      thElements.forEach(th => {
        const td = document.createElement('td');
        td.innerHTML = th.innerHTML;
        th.parentNode.replaceChild(td, th);
      });
    });
    return `<html>${doc.body.outerHTML}<html>`;
  }

  convertTableContent(html) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html');

    // Convert <tr> elements to <p> elements, concatenate td & th cell contents with inner space added
    doc.querySelectorAll('tr').forEach(tr => {
      tr.outerHTML = `<p>${Array.from(tr.querySelectorAll('td, th')).map(cell => cell.innerHTML).join(' ')}</p>`
    });

    // Convert orphan td & th elements to their innerHTML plus trailing space
    doc.querySelectorAll('td, th').forEach(cell => {
      cell.outerHTML = `${cell.innerHTML} `;
    });
  
    // Collapse thead, tbody, and tfoot elements to their innerHTML
    doc.querySelectorAll('thead, tbody, tfoot').forEach(rowContainers => {
      rowContainers.outerHTML = rowContainers.innerHTML;
    });

    // Collapse table elements to their innerHTML
    doc.querySelectorAll('table').forEach(tableEle => {
      tableEle.outerHTML = tableEle.innerHTML;
    });

    return `<html>${doc.body.outerHTML}<html>`;
  }

  getDOMPurifyOptions() {
    let tidy = {};

    if (this.allowed?.tags) tidy.ALLOWED_TAGS = this.allowed.tags;
    if (this.allowed?.attributes) tidy.ALLOWED_ATTR = this.allowed.attributes;

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
      toolbar?.controls?.forEach((control) => {
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
              tidy.ALLOWED_TAGS.push('em');
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
              tidy.ALLOWED_ATTR.push('height');
              tidy.ALLOWED_ATTR.push('width');
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
              tidy.ALLOWED_ATTR.push('height');
              tidy.ALLOWED_ATTR.push('width');
            }
            break;

          case 'blockquote':
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push(control[0]);
            }
            break;

          case 'table':
            if (undefinedTags) {
              tidy.ALLOWED_TAGS.push('table');
              tidy.ALLOWED_TAGS.push('tr');
              tidy.ALLOWED_TAGS.push('td');
            }
            break;
        }
      });

      // support custom toolbar buttons from options
      if (toolbar?.controls) {
        this.customButtons?.forEach((button) => {
          if (toolbar.controls.some(control => control[0] === button.module)) {
            button.allowedTags?.forEach((tag) => {
              tidy.ALLOWED_TAGS.push(tag);
            });
            button.allowedAttr?.forEach((attr) => {
              tidy.ALLOWED_ATTR.push(attr);
            });
          }
        });
      }
    }

    return tidy;
  }

  // replace forbidden block elements with a p tag
  substitute(html, DOMPurifyOptions) {
    let substitution;

    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const blockElements = [
      'p',
      'div',
      'section',
      'article',
      'fieldset',
      'address',
      'aside',
      'blockquote',
      'canvas',
      'dl',
      'figcaption',
      'figure',
      'footer',
      'form',
      'header',
      'main',
      'nav',
      'noscript',
      'ol',
      'pre',
      'ul',
      'video',
    ];
    const newLineElements = ['li', 'dt', 'dd', 'hr'];

    DOMPurify.addHook('uponSanitizeElement', (node, data, config) => {
      // check if current tag is a heading
      // - is it supported?
      // - no? - replace it with <p> and <b>
      // -----------------
      // check if current tag is a block element
      // - is it supported?
      // - no? - replace it with <p>
      // -----------------
      // check if current tag is a new line element
      // - is it supported?
      // - no? - remove the tag and append a <br>

      // find possible substitution
      let i = 0;
      while (!substitution && i < 3) {
        if (DOMPurifyOptions.ALLOWED_TAGS.includes(blockElements[i])) substitution = blockElements[i];
        ++i;
      }

      if (substitution && node.tagName && !DOMPurifyOptions.ALLOWED_TAGS.includes(node.tagName.toLowerCase())) {
        const tagName = node.tagName.toLowerCase();
        if (headings.includes(tagName)) {
          node.innerHTML = `<${substitution}><b>${node.innerHTML}</b></${substitution}>`;
        } else if (blockElements.includes(tagName)) {
          node.innerHTML = `<${substitution}>${node.innerHTML}</${substitution}>`;
        } else if (newLineElements.includes(tagName)) {
          node.innerHTML = `${node.innerHTML}<br>`;
        }
      }
    });

    html = DOMPurify.sanitize(html, { ...DOMPurifyOptions, ...{ RETURN_DOM: true, WHOLE_DOCUMENT: false } });
    DOMPurify.removeAllHooks();

    return [html, substitution];
  }

  isURL(str) {
    const pattern = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/isu;
    return !!pattern.test(str);
  }
}

Quill.register('modules/clipboard', QuillPasteSmart, true);
export default QuillPasteSmart;
