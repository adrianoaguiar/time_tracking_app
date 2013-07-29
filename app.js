(function(){
  var TimeHelper = {
    _parseInt: function(num){
      return parseInt(num, 0);
    },
    msToSeconds: function(ms){
      return ms / 1000;
    },
    msToMinutes: function(ms){
      return this.msToSeconds(ms) / 60;
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
    msToObject: function(ms, options){
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
    thresholdReached: false,
    uniqueID: '',

    events: {
      'app.activated'                           : 'activate',
      'ticket.form.id.changed'                  : function(){ _.defer(this.hideOrDisableFields()); },
      'ticket.requester.email.changed'          : 'loadIfDataReady',
      'click .time-tracker-submit'              : 'submit',
      'click .time-tracker-custom-submit'       : 'submitCustom',
      'click .custom-time-modal-toggle'         : function(){ this.$('.custom-time-modal').modal('show'); }
    },

    requests: {
      updateTicket: function(attributes){
        return {
          url: '/api/v2/tickets/' + this.ticket().id() + '.json',
          type: 'PUT',
          dataType: 'json',
          data: JSON.stringify(attributes),
          contentType: 'application/json',
          proxy_v2: true,
          processData: false
        };
      }
    },
    activate: function(data){
      this.doneLoading = false;

      _.defer(this.hideOrDisableFields());

      this.loadIfDataReady();
    },

    hideOrDisableFields: function(){
      if (this._timeFieldUI()){ this._timeFieldUI().hide(); this._timeFieldUI().disable(); }
      if (this._historyFieldUI()){ this._historyFieldUI().disable(); }
    },

    loadIfDataReady: function(){
      if (!this.doneLoading &&
          this.ticket()) {

        if (this.shouldNotRun())
          return this.displayError();

        if (!this.counterStarted){
          this.enableSave();
          this.startCounter();
          this.counterStarted = true;
        }

        this.uniqueID = this._generateUniqueID();

        services.appsTray().show();

        this.baseHistory = this._historyField() || '';
        this.baseTime = TimeHelper.extractFromHistory(this.baseHistory);

        var ceiledBaseTime = Math.ceil(TimeHelper.msToMinutes(this.baseTime));

        this.switchTo('form', {
          can_submit_custom_time: this.setting("can_submit_custom_time"),
          can_submit_both_time: this.setting("can_submit_custom_time") && this.setting("can_submit_current_time"),
          custom_time: this._customTimeDefault(),
          custom_time_format: this._customTimeFormat(),
          total_time: this._prettyTotalTime(TimeHelper.minutesToMs(ceiledBaseTime)),
          unique_id: this.uniqueID
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
      this.$('.custom-time-modal').modal('hide');
    },

    disableSaveOnTimeout: function(self){
      return setTimeout(function(){
        self.disableSave();
      }, self._disableSaveInterval());
    },

    setTimeLoop: function(self){
      return setInterval(function(){

        if (self.ticket() &&
            self.ticket().status()){

          var ms = self.setWorkedTime();

          if (ms >= self._thresholdToStart() &&
              !self.thresholdReached){
            self.disableSave();
            self.$('.submit-container').show();
            self.thresholdReached = true;
          }
        } else {
          self.destroy();
        }
      }, 1000);
    },

    destroy: function(){
      this.counterStarted = false;
      clearInterval(this.timeLoopID);
      this.timeLoopID = null;
      this.enableSave();
      this.thresholdReached = false;
      this.switchTo('loading');
    },

    // Returns worded time as ms
    setWorkedTime: function(){
      var ms = this._elapsedTime();
      var elapsedTime = TimeHelper.msToObject(ms);

      this.$('span.time-'+this.uniqueID).html(TimeHelper.prettyTime(elapsedTime));

      return ms;
    },

    setDefaults: function(){
      if (_.isEmpty(this.$('span.date').text()))
        this.$("span.date").html(this._formattedDate());

      this.setWorkedTime();

      if (this.thresholdReached){
        this.$('.submit-container').show();
      } else{
        this.$('.submit-container').hide();
      }
    },
    // time == ms
    addTime: function(time) {
      var newTime = TimeHelper.prettyTime(TimeHelper.msToObject(time));
      // We ceil as requested by toby/Max
      var newTotalTimeInMinutes = Math.ceil(TimeHelper.msToMinutes(this.calculateNewTime(time)));
      var newHistory = this.baseHistory + '\n' +  this.currentUser().name() +
        ',' + newTime + ',' + this._formattedDate('yyyy-mm-dd') + '';
      var attributes = { ticket: { custom_fields: [] }};

      this.ticket().customField(this._historyFieldLabel(), newHistory);
      attributes.ticket.custom_fields.push({ id: this.settings.timehistory, value: newHistory });
      this.ticket().customField(this._timeFieldLabel(), newTotalTimeInMinutes);
      attributes.ticket.custom_fields.push({ id: this.settings.totaltime, value: newTotalTimeInMinutes });

      this.$('span.total_time').html(this._prettyTotalTime(TimeHelper.minutesToMs(newTotalTimeInMinutes)));
      this.ajax('updateTicket', attributes);
      this.enableSave();
    },

    calculateNewTime: function(time){
      return this.baseTime + time;
    },
    _prettyTotalTime: function(time){
      return TimeHelper.prettyTime(TimeHelper.msToObject(time)).slice(0,5);
    },
    _generateUniqueID: function(){
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);

        return v.toString(16);
      });
    },
    _customTimeDefault: function(){
      return _.map(this._customTimeFormat().split(':'),
                   function(i) { return "00";}).join(":");
    },
    _customTimeFormat: function(){
      return this.setting('custom_time_format') || "HH:MM";
    },
    _thresholdToStart: function(){
      return (Number(this.settings.start_threshold) || 15) * 1000;
    },
    _disableSaveInterval: function(){
      return (Number(this.settings.block_save_interval) || 5) * 1000;
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
