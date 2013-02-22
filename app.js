(function(){
  return {
    appID:  'simple time tracking',
    defaultState: 'loading',
    startedTime: '',
    baseHistory: '',
    baseTime: '',
    counterStarted: false,

    events: {
      'app.activated'                           : 'onActivated',
      'ticket.requester.email.changed'          : 'loadIfDataReady',
      'click .time-tracker-submit'              : 'submit',
      'click .time-tracker-custom-submit'       : 'submitCustom'
    },

    onActivated: function(data){
      this.doneLoading = false;
      this.loadIfDataReady();
    },

    loadIfDataReady: function(){

      if (!this.doneLoading && this.ticket() &&
          this.ticket().requester() &&
          this.ticket().requester().email()) {

        if (!this.setting('active_on_new') &&
            this.ticket().status() === 'new')
          return;

        if (!this.counterStarted){
          this.startCounter();
          this.counterStarted = true;
        }

        services.appsTray().show();

        this.baseHistory = this._historyField() || '';
        this.baseTime = this._timeField();

        this._timeFieldUI().disable();
        this._historyFieldUI().disable();

        this.switchTo('form', {
          custom_time: this._customTimeDefault(),
          custom_time_format: this._customTimeFormat()
        });

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
      this.disableSaveOnTimeout(this);
    },

    submitCustom: function(){
      this.addTime(this._humanToMs(this.$('div.modal-body input').val()));
      this.disableSaveOnTimeout(this);
      this.$('#customTimeModal').modal('hide');
    },

    disableSaveOnTimeout: function(self){
      return setTimeout(function(){
        self.disableSave();
      }, self._disableSaveInterval());
    },

    setTimeLoop: function(self){
      return setInterval(function(){
        if (_.isEmpty(self.$('span.time'))){
          clearInterval(self.timeLoopID);
        } else {
          var ms = self.setWorkedTime();

          if (ms > self._thresholdToStart() &&
              _.isUndefined(self.thresholdReached)){
            self.disableSave();
            self.$('.submit-container').show();
            self.thresholdReached = true;
          }
        }
      }, 1000);
    },

    // Returns worded time as ms
    setWorkedTime: function(){
      var ms = this._elapsedTime();
      var elapsedTime = this._msToHuman(ms);

      this.$('span.time').html(this._prettyTime(elapsedTime));

      return ms;
    },

    setDefaults: function(){
      if (_.isEmpty(this.$('span.date').text()))
        this.$("span.date").html(this._formattedDate());

      this.setWorkedTime();

      if (_.isUndefined(this.thresholdReached)){
        this.$('.submit-container').hide();
      } else{
        this.$('.submit-container').show();
      }
    },

    addTime: function(time) {
      var newTime = (_.isUndefined(time) ? this.calculateNewTime() :
                     this.calculateNewTime(time));

      newTime = this._prettyTime(newTime);

      var newHistory = this.baseHistory + '\n' +  this.currentUser().name() +
        ',' + newTime + ',' + this._formattedDate('yyyy-mm-dd') + '';

      this.ticket().customField(this._timeFieldLabel(), newTime);
      this.ticket().customField(this._historyFieldLabel(), newHistory);

      this.enableSave();
    },

    calculateNewTime: function(time){
      var oldTime = (this.baseTime || '00:00:00').split(':'),
      currentElapsedTime = (_.isUndefined(time) ? this._elapsedTime() : time),
      hours = parseInt((oldTime[0] || 0), 0),
      minutes = parseInt((oldTime[1] || 0), 0),
      seconds = parseInt((oldTime[2] || 0), 0);

      var newTime = (parseInt(hours, 0) * 3600000) +
        (parseInt(minutes, 0) * 60000) +
        (parseInt(seconds, 0) * 1000) +
        currentElapsedTime;

      return this._msToHuman(newTime);
    },

    _customTimeDefault: function(){
      return _.map(this._customTimeFormat().split(':'),
                   function(i) { return "00";}).join(":");
    },
    _customTimeFormat: function(){
      return this.setting('custom_time_format') || "HH:MM";
    },
    _thresholdToStart: function(){
      return ((parseInt(this.settings.start_threshold, 0) || 15) * 1000);
    },
    _disableSaveInterval: function(){
      return ((parseInt(this.settings.block_save_interval, 0) || 5) * 1000);
    },
    _formattedDate: function(format){
      var dateString = format || this._dateFormat(),
      date = new Date();

      dateString = dateString.replace('dd', this._addSignificantZero(date.getDate()));
      dateString = dateString.replace('mm', this._addSignificantZero(date.getMonth() + 1));

      return dateString.replace('yyyy', date.getFullYear());
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
    _humanToMs: function(timestring){
      var time = timestring.split(':').map(function(i){return parseInt(i, 0);});
      var computedTime = 0;

      // If length is equal to 2 then the first element represents hours and the second minutes.
      // Else the first element represents minutes
      if (time.length === 2){
        computedTime = (time[0] * 3600) + (time[1] * 60);
      } else {
        computedTime = time[0] * 60;
      }

      return computedTime * 1000;
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
    },
    _dateFormat: function(){
      return this.settings.date_format || 'yyyy-mm-dd';
    }
  };
}());
