(function(){
    return {
        appID:  'simple time tracking',
        defaultState: 'loading',
        startedTime: '',
        baseHistory: '',
        baseTime: '',

        events: {
            'app.activated': 'onActivated',
            'ticket.requester.email.changed': 'loadIfDataReady',
            'click #time-tracker-submit': 'submit'
        },

        onActivated: function(data){
            if(data.firstLoad)
                this.startCounter();

            this.doneLoading = false;
            this.loadIfDataReady();
        },

        loadIfDataReady: function(){
            var ticket = this.ticket(),
            requester = ticket.requester(),
            requesterEmail = requester && requester.email();

            if (!this.doneLoading && !_.isEmpty(requesterEmail)) {
                if (this.ticket().status() === 'new')
                    return;

                services.appsTray().show();

                this.baseHistory = this._historyField() || '';
                this.baseTime = this._timeField();

                this._timeFieldUI().disable();
                this._historyFieldUI().disable();

                this.switchTo('form');

                this.setDefaults();
                this.doneLoading = true;
            }
        },


        startCounter: function(){
            if (_.isEmpty(this.timeLoopID)){
                this.startedTime = new Date();
                this.timeLoopID = this.setTimeLoop(this);
            }
        },

        submit: function(event){
            event.preventDefault();
            this.addTime();
            this.enableSave();
            this.disableSaveOnTimeout(this);
        },

        disableSaveOnTimeout: function(self){
            return setTimeout(function(){
                self.disableSave();
            }, 15000);
        },

        setTimeLoop: function(self){
            return setInterval(function(){
                if (_.isEmpty(self.$('#time'))){
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

            this.$('#time').html(this._prettyTime(elapsedTime));

            return ms;
        },

        setDefaults: function(){
            if (_.isEmpty(this.$('#date').text()))
                this.$("#date").html(new Date().toJSON().substring(0,10));

            this.setWorkedTime();

            if (_.isUndefined(this.thresholdReached)){
                this.$('#time-tracker-submit').hide();
            } else{
                this.$('#time-tracker-submit').show();
            }
        },

        addTime: function() {
            var newTime = this._prettyTime(this.calculateNewTime());
            var newHistory = this.baseHistory + '\n' +  this.currentUser().name() +
                ',' + newTime + ',' + this.$('#date').text() + '';

            this.ticket().customField(this._timeFieldLabel(), newTime);
            this.ticket().customField(this._historyFieldLabel(), newHistory);

            this.enableSave();
        },
        calculateNewTime: function(){
            var oldTime = (this.baseTime || '00:00:00').split(':'),
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
        },
        _timeFieldUI: function(){
            return this.ticketFields(this._timeFieldLabel());
        },
        _historyFieldUI: function(){
            return this.ticketFields(this._historyFieldLabel());
        },
        _timeField: function(){
            return this.ticket().customField(this._timeFieldLabel());
        },
        _historyField: function(){
            return this.ticket().customField(this._historyFieldLabel());
        },
        _timeFieldLabel: function(){
            return 'custom_field_' + this.settings.totaltime;
        },
        _historyFieldLabel: function(){
            return 'custom_field_' + this.settings.timehistory;
        }
    };
}());
