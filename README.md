:warning: *Use of this software is subject to important terms and conditions as set forth in the License file* :warning:

# Time Tracking App

This App will help you track time spent by your agents on tickets automatically or manually!

## What does the app do?

Time tracking should be simple. You’ve got enough work to do so you shouldn’t have to keep an eye on the clock too. 

With this app, when you start working on a ticket the timers starts, and when you’ve finished updating the ticket, the timer stops. You also have the option to manually input the time for when you need to.

The total amount of time spent on a ticket is saved so you can report on this with our Advanced Analytics reporting. There is also a log field so you can easily see how much time each agent added and when they added it.

## How to use the app:

1. Once you’ve installed the app, when you’re viewing a ticket, click on the ‘Apps’ button in the top right hand corner. You’ll then see the app and the timer will show.
2. As you’re working on a ticket, the timer will continue to run. When you’re ready to submit your time, click on the app’s ‘Submit’ button. If you’ve enabled the setting that allows agents to enter a custom time, the submit button will be a dropdown, allowing you to choose between ‘Actual time’ and ‘Custom time’.
3. Once the entry has been saved, it will be added to the field that is recording the total time spent on a ticket, and the entry will be included in the time log field. You can continue to work on the ticket or submit your response to the requester by clicking on the ticket ‘Submit’ button.

## How to install the app:

1. Choose whether you would like to record the time in HH:MM or MM format.
For example, 1 hour 45 minutes in HH:MM would be 01:45 and 105 in MM.
If you choose to record time in minutes (MM), you can perform calculations on that number in our Advanced Analytics reporting. If you choose to record the time in hours and minutes (HH:MM), you can still report on that value, but you won’t be able to perform calculations on it.

2. Create a text field called ‘Total Time’ if you’re using the HH:MM format and make a note of the custom field ID. If you’re using the MM format, create a numeric field called ‘Total Time’ and make a note of the custom field ID. For either time format, you’ll need to create a multi-line text field called ‘Time Log’, remember to make a note of the custom field ID.
Before moving onto the next step, you should have created two new fields, ‘Total Time’ and ‘Time Log’ and you should have the custom ticket field IDs for both.

3. Go to Manage > Apps > Create and click on "Create a new app". Give the app a name like “Time Tracking” and provide a description like “Record the time spent on tickets”. Upload the app ZIP file and click on “Save”.

4. You’ll then see the app in Manage > Apps > Browse.  Hover over the "Time Tracking" app and click on the “Install” button. There are now several settings that you need to configure:
 * Time Field: enter the custom ticket field ID of the ‘Time’ field that you created.
 * History Field: enter the custom ticket field ID of the ‘Time Log’ field that you created
 * Threshold Field: this is the amount of time in seconds before the app blocks the ticket submit button. After this happens, it is necessary for agents to log their time before updating the ticket.
 * Date Format: choose the date format you would like to use by entering dd-mm-yyyy, mm-dd-yyyy or yyyy-mm-dd.
 * Lock Interval: this is the amount of time in seconds before the app blocks the ticket submit button after the agent has already logged their time.
 * Active on new ticket?: enabling this setting allows agents to record time for tickets that have a status of ‘New’.
 * Agent can submit custom time?: enabling this setting allows agents to manually enter a time duration.
 * Agent can submit calculated time?: enabling this setting allows agents to submit the time the timer has calculated.
 * Custom Time Format: enter HH:MM or MM depending on the time format you would like to use.

5. Click “Install” to complete the setup and then refresh your browser. You can now start using the app.


By downloading this app, you are agreeing to our [terms and conditions](https://github.com/zendesklabs/wiki/wiki/Terms-and-Conditions)
