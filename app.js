(function(){
  var TimeHelper = {
    _parseInt: function(num){
      return parseInt(num, 0);
    },
    msToSeconds: function(ms){
      return this._parseInt(ms / 1000);
    },
    msToMinutes: function(ms){
      return this._parseInt((this.msToSeconds(ms) / 60));
    },
    minutesToMs: function(minutes){
      return this._parseInt(minutes * 60000);
    },
    addSignificantZero: function(num){
      return((num < 10 ? '0' : '') + num);
    },
    humanToMs: function(timestring){
      var time = timestring.split(':').map(function(i){
        return this._parseInt(i);
      }, this);
      var computedTime = 0;

      // If length is equal to 2 then the first element represents hours and the second minutes.
      // Else the first element represents minutes

      if (time.length === 3){
        computedTime = (time[0] * 3600) + (time[1] * 60) + time[2];
      } else if (time.length === 2){
        computedTime = (time[0] * 3600) + (time[1] * 60);
      } else {
        computedTime = time[0] * 60;
      }

      return computedTime * 1000;
    },
    msToObject: function(ms){
      var time = this._parseInt((ms / 1000));
      var seconds = time % 60;
      time = this._parseInt(time/60);
      var minutes = time % 60;
      var hours = this._parseInt(time/60) % 24;

      return {
        seconds: seconds,
        minutes: minutes,
        hours: hours
      };
    },
    prettyTime: function(timeObject){
      return this.addSignificantZero(timeObject.hours) + ':' +
        this.addSignificantZero(timeObject.minutes) + ':' +
        this.addSignificantZero(timeObject.seconds);
    },
    extractFromHistory: function(history){

      if (_.isEmpty(history))
        return 0;

      return _.reduce(history.match(/\d{2}:\d{2}:\d{2}/g),
                     function(memo,time){
                       return memo + this.humanToMs(time);
                     }, 0, this);
    }
  };

  return {
    appID:  'simple time tracking',
    defaultState: 'loading',
    startedTime: 0,
    baseHistory: 0,
    baseTime: 0,
    counterStarted: false,

    events: {
      'app.activated'                           : 'onActivated',
      'ticket.requester.email.changed'          : 'loadIfDataReady',
      'click .time-tracker-submit'              : 'submit',
      'click .time-tracker-custom-submit'       : 'submitCustom'
    },

    onActivated: function(data){
      this.doneLoading = false;

      this.hideOrDisableFields();

      this.loadIfDataReady();
    },

    hideOrDisableFields: function(){
      this._timeFieldUI().hide();
      this._timeFieldUI().disable();
      this._historyFieldUI().disable();
    },

    loadIfDataReady: function(){
      if (!this.doneLoading && this.ticket() &&
          this.ticket().requester() &&
          this.ticket().requester().email()) {

        if (this.shouldNotRun())
          return this.displayError();

        if (!this.counterStarted){
          this.startCounter();
          this.counterStarted = true;
        }

        services.appsTray().show();

        this.baseHistory = this._historyField() || '';
        this.baseTime = TimeHelper.extractFromHistory(this.baseHistory);

        this.switchTo('form', {
          can_submit_custom_time: this.setting("can_submit_custom_time"),
          can_submit_both_time: this.setting("can_submit_custom_time") && this.setting("can_submit_current_time"),
          custom_time: this._customTimeDefault(),
          custom_time_format: this._customTimeFormat(),
          total_time: this._prettyTotalTime(this.baseTime)
        });

        this.setDefaults();
        this.doneLoading = true;
      }
    },

    shouldNotRun: function(){
      return (!(this.setting('can_submit_custom_time') ||
                this.setting('can_submit_current_time')) ||
              (!this.setting('active_on_new') &&
               this.ticket().status() === 'new') ||
              (this.ticket().status() === 'closed'));
    },

    displayError: function(){
      if (!(this.setting('can_submit_custom_time') ||
            this.setting('can_submit_current_time'))){
        this.switchTo('settings_error');
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

      this.addTime(this._elapsedTime());
      this.disableSaveOnTimeout(this);
    },

    submitCustom: function(){
      this.addTime(TimeHelper.humanToMs(this.$('div.modal-body input').val()));
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
      var elapsedTime = TimeHelper.msToObject(ms);

      this.$('span.time').html(TimeHelper.prettyTime(elapsedTime));

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
    // time == ms
    addTime: function(time) {
      var newTime = TimeHelper.prettyTime(TimeHelper.msToObject(time));
      var newTotalTime = this.calculateNewTime(time);
      var newHistory = this.baseHistory + '\n' +  this.currentUser().name() +
        ',' + newTime + ',' + this._formattedDate('yyyy-mm-dd') + '';

      this.ticket().customField(this._historyFieldLabel(), newHistory);
      this.ticket().customField(this._timeFieldLabel(), TimeHelper.msToMinutes(newTotalTime));

      this.$('span.total_time').html(this._prettyTotalTime(newTotalTime));

      this.enableSave();
    },

    calculateNewTime: function(time){
      return this.baseTime + time;
    },
    _prettyTotalTime: function(time){
      return TimeHelper.prettyTime(TimeHelper.msToObject(time)).slice(0,5);
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

      dateString = dateString.replace('dd', TimeHelper.addSignificantZero(date.getDate()));
      dateString = dateString.replace('mm', TimeHelper.addSignificantZero(date.getMonth() + 1));

      return dateString.replace('yyyy', date.getFullYear());
    },
    _elapsedTime: function(){
      return new Date() - this.startedTime;
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
