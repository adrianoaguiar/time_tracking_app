(function(){
    var displayTime = function() {
        return this.settings.totaltime;
    };
    var displayHistory = function() {
        return this.settings.timehistory;
    };
    return {
        appID:  'simple time tracking',
        defaultState: 'loading',
        loadedValue: '',
        loadedHistory: '',
        timeRegex: '',
        realRegex: '',
        startedTime: '',
        events: {
            'app.activated': 'isLoaded',
            'ticket.requester.email.changed': 'haveRequester',
            'getTicketField.done': 'setTicketParam',
            'click #time-tracker-submit': 'submit'
        }, //end events
        //REQUESTS
        requests: {
            getTicketField: function(ticketID){
                return {
                    url: '/api/v2/ticket_fields/' + ticketID +'.json',
                    dataType: 'JSON',
                    type: 'GET',
                    contentType: 'application/json'
                };
            }
        },
        isLoaded: function(data){
            if(data.firstLoad){
                if (_.isEmpty(this.timeLoopID)){
                    this.startedTime = new Date();
                    this.timeLoopID = this.setTimeLoop(this);
                }
            }

            var timeField = displayTime.call(this);
            var historyField = displayHistory.call(this);
            this.haveRequester();
            this.ticketFields('custom_field_' + timeField +'').disable();
            this.ticketFields('custom_field_' + historyField +'').disable();
            this.ajax('getTicketField', timeField);
        },

        submit: function(event){
            event.preventDefault();
            this.addTime();
            this.enableSave();
        },

        setTimeLoop: function(self){
            return setInterval(function(){
                if (_.isEmpty(self.$('#add_time'))){
                    clearInterval(self.timeLoopID);
                } else {
                    var ms = self.setWorkedTime();

                    if (ms > 15000 &&
                        _.isUndefined(self.thresholdReached)){
                        self.disableSave();
                        self.$('#time-tracker-submit').show();
                        self.thresholdReached = true;
                    }
                }
            }, 5000);
        },

        // Returns worded time as ms
        setWorkedTime: function(){
            var ms = this._elapsedTime();
            var elapsedTime = this._msToHuman(ms);

            this.$('#add_time').val(this._prettyTime(elapsedTime));

            return ms;
        },

        haveRequester: function() {
            var timeField = displayTime.call(this);
            var historyField = displayHistory.call(this);
            var requesterEmail = this.ticket().id() && this.ticket().requester().email();

            if ( _.isEmpty(requesterEmail)) { return; }

            this.loadedValue = this.ticket().customField('custom_field_' + timeField +'');
            this.loadedHistory = this.ticket().customField('custom_field_' + historyField +'') || '';
            this.switchTo('form', {
                validation: this.timeRegex
            });

            this.setDefaults();
        },

        setDefaults: function(){
            if (_.isEmpty(this.$('#add_date').val()))
                this.$("#add_date").val(new Date().toJSON().substring(0,10));

            this.setWorkedTime();

            if (_.isUndefined(this.thresholdReached)){
                this.$('#time-tracker-submit').hide();
            } else{
                this.$('#time-tracker-submit').show();
            }
        },
        addTime: function() {
            var timeField = displayTime.call(this);
            var historyField = displayHistory.call(this);
            var re = this.realRegex;
            var dateRegex = /^\d{4}(\-|\/|\.)\d{1,2}\1\d{1,2}$/;
            var isValidTime = re.test(this.$('#add_time').val());
            var hasTime = dateRegex.test(this.$('#add_date').val());
            if (_.all([isValidTime, hasTime], _.identity)) {
                var newTime = this._prettyTime(this.calculateNewTime());
                var newHistory = this.loadedHistory + '\n' +  this.currentUser().name() + ',' + newTime + ',' + this.$('#add_date').val() + '';
                this.ticket().customField('custom_field_' + timeField +'', newTime);
                this.ticket().customField('custom_field_' + historyField +'', newHistory);
                this.enableSave();
            } else {
                this.ticket().customField('custom_field_' + timeField +'', this.loadedValue);
                this.ticket().customField('custom_field_' + historyField +'', this.loadedHistory);
                this.disableSave();
            }
        },
        setTicketParam: function(data) {
            this.realRegex = new RegExp(data.ticket_field.regexp_for_validation);
            this.timeRegex = data.ticket_field.regexp_for_validation;
            this.haveRequester();
        },

        calculateNewTime: function(){
            var oldTime = (this.loadedValue || '00:00:00').split(':'),
                currentElapsedTime = this._elapsedTime(),
                hours = parseInt((oldTime[0] || 0), 0),
                minutes = parseInt((oldTime[1] || 0), 0),
                seconds = parseInt((oldTime[2] || 0), 0);

            var newTime = (parseInt(hours, 0) * 3600000) +
                (parseInt(minutes, 0) * 60000) +
                (parseInt(seconds, 0) * 1000) +
                currentElapsedTime;

            return this._msToHuman(newTime);
        },

        _msToHuman: function(ms){
            var time = parseInt((ms / 1000), 0);
            var seconds = time % 60;
            time = parseInt(time/60, 0);
            var minutes = time % 60;
            var hours = parseInt(time/60, 0) % 24;

            return {
                seconds: seconds,
                minutes: minutes,
                hours: hours
            };
        },
        _addSignificantZero: function(num){
            return((num < 10 ? '0' : '') + num);
        },

        _elapsedTime: function(){
            return new Date() - this.startedTime;
        },

        _prettyTime: function(time){
            return this._addSignificantZero(time.hours) + ':' +
                this._addSignificantZero(time.minutes) + ':' +
                this._addSignificantZero(time.seconds);
        }

    };
}());
