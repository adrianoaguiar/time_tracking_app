(function(){
  return {
    INTERVAL: 2000,
    counterStarted: false,
    paused: false,
    events: {
      'app.activated'                           : 'activate',
      'ticket.form.id.changed'                  : 'hideTimeFields',
      'app.deactivated'                         : 'pause',
      'ticket.requester.email.changed'          : 'initializeIfReady',
      'click .pause'                            : 'pause',
      'click .resume'                           : 'resume'
    },

    activate: function(data){
      this.hideTimeFields();

      if (this.paused)
        return this.resume();

      this.initializeIfReady();
    },

    hideTimeFields: function(){
      this.eachTimeField(function(field){
        if (this.ticketFields(field)) {
          this.ticketFields(field).hide();
        }
      });
    },

    initializeIfReady: function(){
      if (this.isReady()) {
        this.setDefaults();
        if (!this.counterStarted){
          this.startCounter();
        }

        services.appsTray().show();

        this.switchTo('show');

        this.doneLoading = true;
      }
    },

    isReady: function(){
      return (!this.doneLoading &&
              this.ticket().status() != 'closed');
    },

    setDefaults: function(){
      this.eachTimeField(function(field){
        if (!_.isFinite(Number(this.ticket().customField(field)))){
          this.ticket().customField(field, "0");
        }
      }, this);
    },

    startCounter: function(){
      if (_.isEmpty(this.timeLoopID)){
        this.timeLoopID = this.setTimeLoop(this);
        this.counterStarted = true;
      }
    },

    pause: function(){
      this.switchTo('paused');
      this.paused = true;
    },

    resume: function(){
      this.switchTo('show');
      this.paused = false;
    },

    setTimeLoop: function(self){
      return setInterval(function(){
        if (self.paused) { return; }
        if (self.ticket() &&
            self.ticket().status()){
          var ms = Number(self.ticket().customField("custom_field_"+self.setting('time_ms')));
          var new_ms = ms + self.INTERVAL;

          self.ticket().customField('custom_field_' +
                                    self.setting('time_ms'), new_ms);
          self.ticket().customField('custom_field_' +
                                    self.setting('time_mn'), Math.ceil(new_ms / 60000));
        } else {
          clearInterval(self.timeLoopID);
          self.timeLoopID = null;
          self.counterStarted = false;
        }
      }, self.INTERVAL);
    },

    eachTimeField: function(iterator){
      _.each(['time_mn', 'time_ms'], function(field){
        iterator.call(this, 'custom_field_'+this.setting(field));
      }, this);
    }
  };
}());
