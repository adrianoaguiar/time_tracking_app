(function(){
  return {
    INTERVAL: 2000,
    counterStarted: false,
    paused: false,
    events: {
      'app.activated'                           : 'activate',
      'ticket.requester.email.changed'          : 'initializeIfReady',
      'click .pause'                            : function(){
        this.switchTo('paused');
        this.paused = true;
      },

      'click .resume'                           : function(){
        this.switchTo('show');
        this.paused = false;
      }
    },

    activate: function(data){
      this.doneLoading = false;

      this.initializeIfReady();
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
      return (!this.doneLoading && this.ticket() &&
              this.ticket().status() != 'closed' &&
              this.ticket().requester() && this.ticket().requester().email());
    },

    setDefaults: function(){
      _.each(['time_mm', 'time_ms'], function(field){
        if (!_.isFinite(Number(this.ticket().customField("custom_field_"+this.setting(field))))){
          this.ticket().customField("custom_field_"+this.setting(field), 0);
        }
      }, this);
    },

    startCounter: function(){
      if (_.isEmpty(this.timeLoopID)){
        this.timeLoopID = this.setTimeLoop(this);
        this.counterStarted = true;
      }
    },

    setTimeLoop: function(self){
      return setInterval(function(){
        if (self.paused) { return; }
        if (self.ticket() &&
           _.isFinite(self.ticket().id())){
          var ms = Number(self.ticket().customField("custom_field_"+self.setting('time_ms')));
          var new_ms = ms + self.INTERVAL;

          self.ticket().customField('custom_field_' +
                                    self.setting('time_ms'), new_ms);
          self.ticket().customField('custom_field_' +
                                    self.setting('time_mm'), Math.ceil(new_ms / 60000));
        } else {
          clearInterval(self.timeLoopID);
        }
      }, self.INTERVAL);
    }
  };
}());
