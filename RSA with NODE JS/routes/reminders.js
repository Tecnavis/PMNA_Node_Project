const express = require('express');
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const c = require('../Controller/reminders');

const adminSite = [jwt, roleAuth('Admin', 'Staff')];

const reminders = express.Router();
reminders.get('/', adminSite, c.list);
reminders.post('/', adminSite, c.create);
reminders.put('/:id', adminSite, c.update);
reminders.patch('/:id/done', adminSite, c.setDone);
reminders.patch('/:id/snooze', adminSite, c.snooze);
reminders.delete('/:id', adminSite, c.remove);

const me = express.Router();
me.get('/home', adminSite, c.home);
me.get('/staff', adminSite, c.staffNames);

module.exports = { reminders, me };
