const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

async function loadPage(t) {
    const root = path.join(__dirname, '..');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const dom = new JSDOM(html, {
        url: 'https://example.invalid/trampoline/',
        runScripts: 'outside-only'
    });
    t.after(() => dom.window.close());
    dom.window.chrome = {};
    dom.window.eval(fs.readFileSync(path.join(root, 'jquery.js'), 'utf8'));
    const script = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/);
    assert.ok(script, 'inline application script exists');
    dom.window.eval(script[1]);
    await new Promise(resolve => dom.window.$(resolve));
    return dom.window.$;
}

for (const from of ['attendee', 'sender', 'follower', 'injector', 'receiver', 'collector', 'director']) {
    test(`${from} to receiver enables the peer field and targets one sender`, async t => {
        const $ = await loadPage(t);
        $('#mode').val(from).trigger('change');
        $('#mode').val('receiver').trigger('change');
        assert.equal($('#peer').prop('disabled'), false);
        assert.equal($('#peer').hasClass('disabled'), false);
        assert.equal($('#peer').val(), 'P01');
        assert.equal(new URL($('#url-expanded').val()).searchParams.get('view'), 'P01');
        $('#peer').val('P42').trigger('keyup');
        assert.equal(new URL($('#url-expanded').val()).searchParams.get('view'), 'P42');
    });
}

test('switching to receiver preserves an existing peer identifier', async t => {
    const $ = await loadPage(t);
    $('#peer').val('P17').trigger('keyup');
    $('#mode').val('receiver').trigger('change');
    assert.equal($('#peer').val(), 'P17');
    assert.equal(new URL($('#url-expanded').val()).searchParams.get('view'), 'P17');
});

test('collector still disables peer selection and uses the all-senders scene', async t => {
    const $ = await loadPage(t);
    $('#mode').val('receiver').trigger('change');
    $('#mode').val('collector').trigger('change');
    assert.equal($('#peer').prop('disabled'), true);
    assert.equal($('#peer').val(), '');
    assert.equal(new URL($('#url-expanded').val()).searchParams.has('view'), false);
});
