# Quill Paste Smart

This plugin extends the default clipboard module of [Quill.js](https://github.com/quilljs/quill) to prevent users from pasting HTML that does not belong into the editor. To do so it looks into your toolbar configuration and deciding which tags and attributes are allowed based on the possible formats.  
However, you can also decide on your own, what is allowed.

<br>

### Installation

You can install this plugin either with [npm](https://www.npmjs.com/) or with [yarn](https://yarnpkg.com/).  
Run one of the following commands from your projects root in a bash prompt.

```bash
npm -i quill-paste-smart
# or: yarn add quill-paste-smart
```

<br>

### Usage

To tell Quill to use this plugin instead of its own clipboard module you need to register it.

```javascript
import Quill from 'quill';
import PasteSmart from 'quill-paste-smart';

Quill.register('modules/clipboard', PasteSmart, true);

```

<br>

### Configuration

Out of the box this plugin will remove all HTML tags and attributes that are not available in the toolbar formats.  
If you don't agree with the default settings, you can decide what is allowed by yourself.  
Also I thought it could be useful to keep the pasted content selected after pasting.

A valid configuration could look like this:

```javascript
const options = {
    theme: 'snow'
    modules: {
        clipboard: {
            allowed: {
                tags: ['a', 'b', 'strong', 'u', 's', 'i', 'p', 'br', 'ul', 'ol', 'li', 'span'],
                attributes: ['href', 'rel', 'target', 'class']
            },
            keepSelection: true,
        },
    },
};
new Quill('#editor', options);
```

<br>

### License
This plugin is licensed under the terms of the [MIT License](https://github.com/Artem-Schander/quill-paste-smart/blob/master/LICENSE)
(See LICENSE file for details).
