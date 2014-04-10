(function($) {

    if (!window.localStorage)
        alert("This application will not correctly work in this browser. Please use modern Chrome or Firefox.");

    var localization  = {
        en: {
            days: ["Sun", "Mon", "Tues", "Wed", "Thu", "Fri", "Sat"],
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            eventCounter: {
                single: "%count% event",
                multiple: "%count% events"
            }
        }
    };

    var Global = {

        daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],

        /**
         * Determines whether year is a leap year
         * @param {Date} date
         * @returns {Boolen}
         */
        isLeapYear: function(date) {
            var year = date.getFullYear();
            return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
        },

        /**
         * Gets days count in month depends on year (leap year or not)
         * @param {Date} date
         * @returns {Number}
         */
        getDaysInMonth: function(date) {
            var month = date.getMonth();

            if (Global.isLeapYear(date) && month == 1)
                return 29;
            
            return Global.daysInMonth[month];
        },

        /**
         * Gets next month date
         * @param {Date} month
         * @returns {Date}
         */
        getNextMonth: function(date) {
            var year = date.getFullYear(),
                month = date.getMonth();

            return month === 11 ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
        },

        /**
         * Gets previous month date
         * @param {Date} month
         * @returns {Date}
         */
        getPrevMonth: function(date) {
            var year = date.getFullYear(),
                month = date.getMonth();

            return month === 0 ? new Date(year - 1, 11, 1) : new Date(year, month - 1, 1);
        },

        /**
         * Gets first day of month (in a week)
         * @param {Date} date
         * @returns {Number}
         */
        getFirstDayOfMonth: function(date) {
            return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        },

        /**
         * Determines whether date lays inside month of second param date
         * @param {Date} date
         * @param {Date} baseDate
         */
        isDateInMonth: function(date, baseDate) {
            var year = baseDate.getFullYear(),
                month = baseDate.getMonth();

            return date >= new Date(year, month, 1) && 
                date <= new Date(year, month, Global.getDaysInMonth(baseDate));
        },

        /**
         * Processes template with data
         * @param {String} template
         * @param {Object} data
         */
        processTemplate: function(template, data) {
            var result = template;

            if (data) {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        result = result.replace(new RegExp('%' + key + '%', 'g'), data[key]);
                    }
                }
            }

            return result;
        }, 

        /**
         * Generates GUID
         */
        guid: function() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                   .toString(16)
                   .substring(1);
            };

            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        }
    };

    /**
     * @typedef TCalendarConfig
     * @param {String} locale
     */

    /**
     * @typedef TCalendarEvent
     * @param {Number} id
     * @param {String} text
     * @param {Date} date
     */

    /**
     * @constructor Calendar
     * @param {JQueryElement} element Element to initialize calendar
     * @param {TCalendarConfig} config Hash of options to configure calendar
     */
    var Calendar = function(element, config) {

        /* Loads data from local storage*/
        this._loadFromLocalStorage();

        /* Root calendar element */
        this.el = element;

        /* Map of TCalendarEvent */
        this.events = this.events || {};

        /* Initiate view date as a current date */
        this.viewDate = new Date();

        this.config = $.extend(this.defaultConfig, config);

        if (!localization[this.config.locale]) {
            console.warn(this.config.locale + " locale is not supported. Default locale will be used.");
            this.config.locale = this.defaultConfig.locale;
        }

        this.localizedData = localization[this.config.locale];

        this.render();

        this._addEventListeners();
    };

    Calendar.prototype = {

        eventTemplate: '<div id="calendar__event-%id%" class="calendar__day-event">%text%</div>',

        weekTemplate: '<div class="calendar__week">%content%</div>',

        dayTemplate: [
            '<div id="%id%" class="calendar__day %classes%">',
                '<div class="calendar__day-content">',
                    '<div class="calendar__day-event-counter">%counter%</div>',
                    '<div class="calendar__day-events">%events%</div>',
                    '<div class="calendar__day-text">%text%</div>',
                '</div>',
            '</div>'
        ].join(''),

        /**
         * Count of weeks shown in calendar
         */
        weekCount: 6,

        /**
         * Count of days in a week
         */
        dayCount: 7,

        /**
         * Default configuration
         */
        defaultConfig: {
            locale: 'en'
        },

        /* ----------- Public methods ------------ */

        /**
         * Renders calendar
         */
        render: function() {
            this._render();
            this._renderWeekDays();
        },

        /**
         * Sets view date and rerenders calendar
         * @param {Date} viewDate
         */
        setViewDate: function(date) {
            if (this.viewDate !== date) {
                this.viewDate = date || new Date();
                this._render();
            }
        },

        /* ---------- Protected methods ------------ */

        /**
         * Renders all dynamic parts of calendar
         */
        _render: function() {
            this._renderMonth();
            this._renderDays();
        },

        /**
         * Renders calendar header (month and year)
         */
        _renderMonth: function() {
            var month = this.viewDate.getMonth(),
                year = this.viewDate.getFullYear(),
                text = this.localizedData.months[month] + " " + year;

            this.el.find('.calendar__head-month').text(text);
        },

        /**
         * Renders list of week days
         */
        _renderWeekDays: function() {
            var days = this.localizedData.days,
                owner = this.el.find('.calendar__week-header'),
                el = $('<div class="calendar__week-day calendar-row"></div>');

            for (var i = 0; i < days.length; i++) {
                owner.append(el.clone().text(days[i]));
            }
        },

        /**
         * Renders calendar days for current month
         */
        _renderDays: function() {
            var 
                i, 
                dates = [],
                prevMonth = Global.getPrevMonth(this.viewDate),
                nextMonth = Global.getNextMonth(this.viewDate),
                firstDay = Global.getFirstDayOfMonth(this.viewDate),
                daysInMonth = Global.getDaysInMonth(this.viewDate),
                daysInPrevMonth = Global.getDaysInMonth(prevMonth),
                firstDayOfMonth = Global.getFirstDayOfMonth(this.viewDate),
                outboundDaysCount = this.weekCount * this.dayCount - daysInMonth,
                prevMonthDays = outboundDaysCount - firstDay >= 2 * this.dayCount 
                    ? firstDay + this.dayCount : firstDay,
                nextMonthDays = outboundDaysCount - prevMonthDays;

            /* Add dates from previous month */
            for (i = daysInPrevMonth - prevMonthDays; i < daysInPrevMonth; i++)
                dates.push(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), i));

            /* Add dates from current month */
            for (i = 0; i < daysInMonth; i++)
                dates.push(new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), i));

            /* Add dates from next month */
            for (i = 0; i < nextMonthDays; i++)
                dates.push(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i));

            this.el.find('.calendar__month').html(this._getMonthHtml(dates));
        },

        /**
         * Gets html content for month (including outbound days)
         * @param {Date[]} dates
         * @returns {String}
         */
        _getMonthHtml: function(dates) {
            var html = '';

            for (var i = 0; i < this.weekCount; i++)
                html += this._getWeekHtml(dates.slice(i * this.dayCount, (i + 1) * this.dayCount));

            return html;
        },

        /**
         * Gets html content for week in calendar
         * @param {Date[]} dates
         * @returns {String}
         */
        _getWeekHtml: function(dates) {
            var html = '';

            for (var i = 0; i < dates.length; i++) {
                html += this._getDayHtml(dates[i]);
            }

            return Global.processTemplate(this.weekTemplate, {
                content: html
            });
        },

        /**
         * Generates html content of the day element
         * @param {Date} date
         * @returns {String}
         */
        _getDayHtml: function(date) {
            var eventsHtml = '',
                events = this._getDateEvents(date);

            for (var i = 0; i < events.length; i++)
                eventsHtml += Global.processTemplate(this.eventTemplate, {
                    id: events[i].id,
                    text: events[i].text || ''
                });

            return Global.processTemplate(this.dayTemplate, {
                id: 'calendar__day-' + date.getTime(),
                counter: this._getEventCounterHtml(date),
                events: eventsHtml,
                classes: Global.isDateInMonth(date, this.viewDate) ? '' : 'outbound',
                text: date.getDate()
            });
        },

        /**
         * Gets event counter html
         * @param {Date} date
         */
        _getEventCounterHtml: function(date) {
            var count = this._getDateEvents(date).length;

            if (count === 0)
                return "";
            else if (count === 1)
                return Global.processTemplate(this.localizedData.eventCounter.single, {
                    count: count
                });
            else 
                return Global.processTemplate(this.localizedData.eventCounter.multiple, {
                    count: count
                });
        },

        /**
         * Gets day element in calendar by particular data
         * @param {Date} date
         * @returns {JQueryElement}
         */
        _getDayElementByDate: function(date) {
            return $('#calendar__day-' + date.getTime());
        },

        /**
         * Gets date for particular day element in calendar
         * @param {JQueryElement} element
         * @returns {Date}
         */
        _getDateByDateElement: function(element) {
            var time = element.attr('id').replace('calendar__day-', '');
            return new Date(parseInt(time, 10));
        },

        /**
         * Gets events array for particular date
         * @param {Date} date
         * @returns {CalendarEvent[]}
         */
        _getDateEvents: function(date) {
            return this.events[date] || (this.events[date] = []);
        },

        /**
         * Shows editor for particular date
         * @param {Date} date
         */
        _showEditor: function(date, element) {
            if (this.editor && this.editor.getDate() !== date)
                this._hideEditor();

            this.editor = new CalendarEditor(element, {
                date: date,
                events: this._getDateEvents(date),
                callbacks: {
                    add: this._onEditorAddEvent.bind(this),
                    remove: this._onEditorRemoveEvent.bind(this)
                }
            });
        },

        /**
         * Hides event editor if exists
         */
        _hideEditor: function() {
            if (this.editor) {
                this.editor.destroy();
                this.editor = null;
            }
        },

        /**
         * Saves event data to local storage
         */
        _saveToLocalStorage: function() {
            localStorage.setItem('events', JSON.stringify(this.events));
        },

        /**
         * Loads event data from local storage
         */
        _loadFromLocalStorage: function() {
            this.events = JSON.parse(localStorage.getItem('events'));
        },

        /* ---------  Event listeners ------------ */

        /**
         * Adds event listeners for DOM elements
         */
        _addEventListeners: function() {
            this.el.on('click', '.calendar__head-month-next', {self: this},
                this._onNextMonthButtonClick);
            this.el.on('click', '.calendar__head-month-prev', {self: this},
                this._onPrevMonthButtonClick);
            this.el.on('click', '.calendar__day-content', {self: this}, 
                this._onDayContentClick);
        },

        /**
         * Processes click on 'next month' button
         * @param {JQueryEvent} event 
         */
        _onNextMonthButtonClick: function(event) {
            var self = event.data.self;
            self.setViewDate(Global.getNextMonth(self.viewDate));
        },

        /**
         * Processes click on 'next month' button
         * @param {JQueryEvent} event 
         */
        _onPrevMonthButtonClick: function(event) {
            var self = event.data.self;
            self.setViewDate(Global.getPrevMonth(self.viewDate));
        },

        /**
         * Processes click on day in calendar (shows form to manage events)
         * @param {JQueryEvent} event 
         */
        _onDayContentClick: function(event) {
            var self = event.data.self,
                el = $(event.target).parents('.calendar__day'),
                date = self._getDateByDateElement(el);

            console.log(date);

            if (!el.hasClass('outbound'))
                self._showEditor(date, el);
            else
                self._hideEditor();
        },

        /**
         * Processes editor adding event
         */
        _onEditorAddEvent: function(event) {
            var html = Global.processTemplate(this.eventTemplate, {
                    id: event.id,
                    text: event.text || ''
                }),
                counterHtml = this._getEventCounterHtml(event.date),
                el = this._getDayElementByDate(event.date);

            el.find('.calendar__day-events').append(html);
            el.find('.calendar__day-event-counter').html(counterHtml);
            this._saveToLocalStorage()
        },

        /**
         * Processes editor removing event
         */
        _onEditorRemoveEvent: function(event) {
            console.log(event.date);
            var el = this._getDayElementByDate(event.date),
                counterHtml = this._getEventCounterHtml(event.date);

            el.find('#calendar__event-' + event.id).remove();
            el.find('.calendar__day-event-counter').html(counterHtml);
            this._saveToLocalStorage();
        }
    };

    /**
     * @typedef TCalendarEditorOptions
     * @param {Date} date
     * @param {CalendarEvent[]} events
     */

    /**
     * @constructor CalendarEditor
     * @param {JQueryElement} element
     * @param {TCalendarEditorOptions} options
     */
    var CalendarEditor = function(element, options) {
        /* Element to add calendar editor */
        this.owner = element;

        /* Options data */
        this.options = options;

        /* Array with events */
        this.events = options.events || [];

        /* Render calendar editor with content */
        this.render();

        /* Add editor event listeners */
        this._addEventListeners();
    };

    CalendarEditor.prototype = {

        /* Editor template */
        template: [
            '<div class="calendar__editor">',
                '<div class="calendar__editor-items"></div>',
                '<textarea class="calendar__editor-input" placeholder="Ctrl + enter - add event"></textarea>',
            '</div>'
        ].join(''),

        /* Template for particular event */
        eventTemplate: [
            '<div id="calendar__editor-event-%id%" class="calendar__editor-item">',
                '<div class="calendar__editor-item-head">',
                    '<div class="calendar__editor-item-title">%text%</div>',
                    '<div class="calendar__editor-item-remove calendar-button"></div>',
                '</div>',
                '<div class="calendar__editor-item-body">',
                    '<div class="calendar__editor-item-text">%text%</div>',
                '</div>',
            '</div>'
        ].join(''),

        /* ----------- Public methods ------------ */

        /**
         * Renders editor with all content
         */
        render: function() {
            this.el = $(this.template);
            this.owner.append(this.el);
            this._renderEvents();
            this._updatePosition();
            this.el.find('.calendar__editor-input').focus();
        },

        /**
         * Gets editing date
         * @returns {Date}
         */
        getDate: function() {
            return this.options.date;
        },

        /**
         * Gets editing event list
         * @param {CalendarEvent[]}
         */
        getEvents: function() {
            return this.events;
        },

        /**
         * Adds event to calendar editor
         * @param {CalendarEvent} event
         */
        addEvent: function(event) {
            var html = Global.processTemplate(this.eventTemplate, event),
                el = this.el.find('.calendar__editor-items');

            this.events.push(event);

            el.append(html);

            el.animate({scrollTop: el.get(0).scrollHeight});

            if (this.options.callbacks.add)
                this.options.callbacks.add(event);
        },

        /**
         * Removes event from calendar editor
         * @param {CalendarEvent} event
         */
        removeEvent: function(event) {
            for (var i = 0; i < this.events.length; i++) {
                if (this.events[i].id === event.id) {
                    this._getElementByEvent(event).remove();
                    this.events.splice(i, 1);
                    if (this.options.callbacks.remove)
                        this.options.callbacks.remove(event);
                }
            }
        },

        /**
         * Destroyes editor
         */
        destroy: function() {
            this.el.remove();
        },

        /* --------- Protected methods ----------- */

        /**
         * Renders editor events
         */
        _renderEvents: function() {
            var el = this.el.find('.calendar__editor-items').empty();

            for (var i = 0; i < this.events.length; i++)
                el.append(Global.processTemplate(this.eventTemplate, {
                    id: this.events[i].id,
                    text: this.events[i].text || ''
                }));
        },

        _updatePosition: function() {

        },

        /**
         * Expandes event
         * @param {CalendarEvent} event
         */
        _expandEvent: function(event) {
            if (this.expandedEvent)
                this._collapseEvent(this.expandedEvent);

            this._getElementByEvent(event).addClass('expand');

            this.expandedEvent = event;
        },

        /**
         * Collapses event
         * @param {CalendarEvent} event
         */
        _collapseEvent: function(event) {
            this._getElementByEvent(event).removeClass('expand');

            if (this.expandedEvent === event)
                this.expandedEvent = null;
        },

        /**
         * Toggles event
         * @param {CalendarEvent} event
         */
        _toggleEvent: function(event) {
            if (this.expandedEvent === event)
                this._collapseEvent(event);
            else
                this._expandEvent(event);
        },

        /**
         * Gets event object by element
         */
        _getEventByElement: function(element) {
            var id = element.attr('id').replace('calendar__editor-event-', '');
            return this._findEventById(id);
        },

        /**
         * Gets event element by event
         * @param {CalendarEvent} event
         * @returns {JQueryElement}
         */
        _getElementByEvent: function(event) {
            return $('#calendar__editor-event-' + event.id);
        },

        /**
         * Finds event by id
         * @param {String} id
         * @returns {CalendarEvent}
         */
        _findEventById: function(id) {
            console.log(this.events, id);
            for (var i = 0; i < this.events.length; i++) {
                if (this.events[i].id === id)
                    return this.events[i];
            }
        },

        /* ---------  Event listeners ------------ */

        /**
         * Adds event listeners for DOM elements
         */
        _addEventListeners: function() {
            this.el.on('keydown', '.calendar__editor-input', {self: this}, 
                this._onKeydown);
            this.el.on('click', '.calendar__editor-item-remove', {self: this}, 
                this._onRemoveButtonClick);
            this.el.on('click', '.calendar__editor-item-head', {self: this},
                this._onItemHeadClick);
        },

        /**
         * Processes ctrl + enter event in editor input
         * @param {JQueryEvent} event 
         */
        _onKeydown: function(event) {
            if (event.ctrlKey && event.keyCode == 13) {
                var text = event.target.value;

                if (text && text !== '') {
                    event.data.self.addEvent({
                        id: Global.guid(),
                        text: text,
                        date: event.data.self.getDate()
                    });
                    event.target.value = '';
                }

                event.preventDefault();
            }
        },

        /**
         * Processes click on remove button
         * @param {JQueryElement} event
         */
        _onRemoveButtonClick: function(event) {
            var self = event.data.self,
                el = $(this).parents('.calendar__editor-item');

            self.removeEvent(self._getEventByElement(el));

            event.stopPropagation();
        },

        /**
         * Processes click on remove button
         * @param {JQueryElement} event
         */
        _onItemHeadClick: function(event) {
            var self = event.data.self,
                el = $(this).parents('.calendar__editor-item');

            self._toggleEvent(self._getEventByElement(el));
            
            event.stopPropagation();
        }
    };

    /**
     * Define as JQuery plugin 'calendar'
     */
    $.fn.calendar = function(config) {
        this.data = new Calendar(this, config);
        return this;
    };

}(window.jQuery));