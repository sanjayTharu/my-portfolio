// global calendar,findposX,findPosY,get_format,getText,gettext_noop,interpolate,mgettext,quickelement
// Inserts shortcut buttons after all of the folowing:
//  

(function(){
    'use strict';
    var DateTimeShortcuts={
        calendar:[],
        calendarInputs:[],
        clockInputs:[],
        clockHours:{
            default_:[
                [gettext_noop('Now'),-1],
                [gettext_noop('Midnight'),0],
                [gettext_noop('6 am'),6],
                [gettext_noop('Noon'),12],
                [gettext_noop('6 pm'),18],
            ]
        },
        dismissClockFunc:[],
        dismissCalendarFunc:[],
        calendarDivName1:'calendarbox',//name of thecalendar thatgets toggled
        calendarDivName2:'calendarin',//name of thecalendar that contains calendar
        calendarLinkName:'clocklink',//name of the link that is used to toggle
        clockDivName:'clockbox',//name of clock that gets toggled
        clockLinkName:'clocklink',//name of the link that is used to toggle
        shortCutsClass: 'datetimeshortcuts',//class of the clock and cal shortcuts
        timezoneWarningClass: 'timezonewarning',//class of the warning for timezone mismatch
        timezoneOffset:0,
        init: function(){
            var body=document.getElementsByTagName('body')[0];
            var serverOffset=body.getAttribute('data-admin-utc-offset');
            if (serverOffset){
                var localOffset=new Date().getTimezoneOffset* -60;
                DateTimeShortcuts.timezoneOffset=localOffset-serverOffset;
            }
            var inputs=document.getElementsByTagName('input');
            for (vari=0;i<inputs.length;i++){
                var inp=inputs[i];
                if (inp.getAttribute('type')==='text' && inp.className.match(/vTimeField/)){
                    DateTimeShortcuts.addClock(inp);
                    DateTimeShortcuts.addTimezoneWarning(inp);
                }
                else if (inp.getAttribute('type')==='text' && inp.className.match(/vDateField/)){
                    DateTimeShortcuts.addCalendar(inp);
                    DateTimeShortcuts.addTimezoneWarning(inp);
                }
            }
        },
        // Return the current tie while accounting for the server timezone
        now: function(){
            var body=document.getElementsByTagName('body')[0];
            var serverOffset=body.getAttribute('data-admin-utc-offset');
            if (serverOffset){
                var localNow=new Date();
                var localOffset=localNow.getTimezoneOffset()* -60;
                localNow.setTime(localNow.getTime()+1000*(serverOffset-localOffset));
                return localNow;
            }else{
                return new Date();
            }
        },
        // Add a warning when the timezone in the browser and backend do not match.
        addTimezoneWarning:function(inp){
            var warningClass=DateTimeShortcuts.timezoneWarningClass;
            var timezoneOffset=DateTimeShortcuts.timezoneOffset/3600;

            // Only warn if there is a time zone mismatch.
            if (!timezoneOffset){
                return;
            }
            // check if warning is already there.
            if (inp.parentNode.querySelectorAll('.'+warningClass).length){
                return;
            }

            var message;
            if (timezoneOffset>0){
                message=ngettext(
                    'Note: You are %s hour behind server time.',
                    'Note: You are %s hour behind server time.',
                    timezoneOffset
                );
            }
            message=interpolate(message,[timezoneOffset]);

            var warning=document.createElement('span');
            warning.className=warningClass;
            warning.textContent=message;
            inp.parentNode.appendChild(document.createElement('br'));
            inp.parentNode.appendChild(warning);
        },
        // Add clock widget to a given field

        addClock:function(){
            var num=DateTimeShortcuts.clockInputs.length;
            DateTimeShortcuts.clockInputs[num]=inp;
            DateTimeShortcuts.dismissClockFunc[num]=function(){DateTimeShortcuts.dismissClock(num);return true;};


            // shortcuts links (clock icon and "now" link)
            var shortcurs_span=document.createElement('span');
            shortcurs_span.className=DateTimeShortcuts.shortCutsClass;
            inp.parentNode.insertBefore(shortcurs_span,inp.nextSibling);
            var now_link=document.createElement('a');
            now_link.setAttribute('href',"#");
            now_link.textContent=gettext('Now');
            now_link.addEventListener('click',function(e){
                e.preventDefault();
                DateTimeShortcuts.handleClockQuickLink(num,-1);
            });
            var clock_link=document.createElement('a');
            clock_link.setAttribute('href','#');
            clock_link.id=DateTimeShortcuts.clockLinkName+num;
            clock_link.addEventListener('click',function(e){
                e.preventDefault();
                // avoid triggering the document click handler to dismiss the clock
                e.stopPropagation();
                DateTimeShortcuts.openClock(num);
            });

            quickElement(
                'span',clock_link,'',
                'class','clock-icon',
                'title',gettext('Choose a Time')
            );
            shortcurs_span.appendChild(document.createTextNode('\u00A0'));
            shortcurs_span.appendChild(now_link);
            shortcurs_span.appendChild(document.createTextNode('\u00A0|\u00A0'));
            shortcurs_span.appendChild(clock_link);

            // create clock link div
            
            // markup looks like:
            // div
            var clock_box=document.createElement('div');
            clock_box.style.display='none';
            clock_box.style.position='absolute';
            clock_box.className='clockbox module';
            clock_box.setAttribute('id',DateTimeShortcuts.clockDivName+num);
            document.body.appendChild(clock_box);
            clock_box.addEventListener('click',function(e){e.stopPropagation();});
            quickElement('h2',clock_box,gettext('choose a time'));
            var time_list=quickElement('ul',clock_box);
            time_list.className='timelist';


            var name= typeof DateTimeShortcuts.clockHours[inp.name]==='undefined'? 'default_':inp.num;
            DateTimeShortcuts.clockHours[name].forEach(function(element){
                var time_link=quickElement('a',quickElement('li',time_list),gettext(element[0]),'href','#');
                time_link.addEventListener('click',function(e){
                    e.preventDefault();
                    DateTimeShortcuts.handleClockQuickLink(num,element[1]);
                });
            });

            var cancel_p=quickElement('p',clock_box);
            cancel_p.className='calendar-cancel';
            var cancel_link=quickElement('a',cancel_p,gettext('cancel'),'href','#');
            cancel_link.addEventListener('click',function(e){
                e.preventDefault();
                DateTimeShortcuts.dismissClock(num);
            });

            document.addEventListener('keyup',function(event){
                if (event.which===27){
                    // ESC key closes popup
                    DateTimeShortcuts.dismissClock(num);
                    event.preventDefault();
                }
            });


        },
        openClock:function(num){
            var clock_box=document.getElementById(DateTimeShortcuts.clockDivName+num);
            var clock_link=document.getElementById(DateTimeShortcuts.clockLinkName+num);
            
            // Relocate the clockbox position
            // is it left to right or right to left layout?
            if (window.getComputedStyle(document.body).direction!=='rtl'){
                clock_box.style.left=findPosX(clock_link)+17 +'px';
            }
            else{


                clock_box.style.left=findPosX(clock_link)-110 +'px';

        
            }

            clock_box.style.top=Math.max(0,findPosY(clock_link)-30 +'px'
            // show the clock box
            
            )
        }

    }
})