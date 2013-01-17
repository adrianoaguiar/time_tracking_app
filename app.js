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
        },

        setTimeLoop: function(self){
            return setInterval(function(){
                if (_.isEmpty(self.$('#add_time'))){
                    clearInterval(self.timeLoopID);
                } else {
                    var elapsedTime = self._msToHuman(new Date() - self.startedTime);

                    self.$('#add_time').val(elapsedTime.hours + ':' +
                                            (elapsedTime.minutes == '00' ? '01' : elapsedTime.minutes));
                }
            }, 2000);
        },

        haveRequester: function() {
            var timeField = displayTime.call(this);
            var historyField = displayHistory.call(this);
            var requesterEmail = this.ticket().id() && this.ticket().requester().email();
            if ( _.isEmpty(requesterEmail)) { return; }
            this.disableSave();

            this.loadedValue = this.ticket().customField('custom_field_' + timeField +'');
            this.loadedHistory = this.ticket().customField('custom_field_' + historyField +'') || '';
            this.switchTo('form', {
                validation: this.timeRegex
            });

            if (_.isEmpty(this.$('#add_date').val()))
                this.$("#add_date").val(new Date().toJSON().substring(0,10));
        },
        addTime: function() {
            var timeField = displayTime.call(this);
            var historyField = displayHistory.call(this);
            var re = this.realRegex;
            var dateRegex = /^\d{4}(\-|\/|\.)\d{1,2}\1\d{1,2}$/;
            var isValidTime = re.test(this.$('#add_time').val());
            var hasTime = dateRegex.test(this.$('#add_date').val());
            if (_.all([isValidTime, hasTime], _.identity)) {
                var newTime = this.timeAcc(this.loadedValue, this.$('#add_time').val());
                var newHistory = this.loadedHistory + '\n' +  this.currentUser().name() + ',' + this.$('#add_time').val() + ',' + this.$('#add_date').val() + '';
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
        pad: function(minutes) {
            var whole;
            if (Number(minutes) < 10) {
                whole = '0' + minutes;
            } else {
                whole = minutes;
            }
            return whole;
        },
        timeAcc: function(currentTotal, additional) {
            var re = /\.|:/;
            var accTime, addTime, total, currentString, additionalString;
            if ( typeof currentTotal !== 'string') {
                currentString = '00:00';
            } else {
                currentString = currentTotal.split(re);
            }
            accTime = Math.floor(Number(currentString[0]) * 60) + Number(currentString[1]);
            if ( typeof additional !== 'string') {
                additionalString = '00:00';
            } else {
                additionalString = additional.split(re);
            }
            addTime = Math.floor(Number(additionalString[0]) * 60) + Number(additionalString[1]);
            total = accTime + addTime;
            return Math.floor(total / 60) + ':' + this.pad(Math.floor(total % 60));
        },

        _msToHuman: function(ms){
            var time = parseInt(((ms) / 1000)/60, 0);
            var minutes = time % 60;
            var hours = parseInt(time/60, 0) % 24;
            var addSignificantZero = function(num){
                return((num < 10 ? '0' : '') + num);
            };

            return {
                minutes: addSignificantZero(minutes),
                hours: addSignificantZero(hours)
            };
        }
    };
}());
