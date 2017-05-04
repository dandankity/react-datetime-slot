'use strict';

var assign = require('object-assign'),
  moment = require('moment'),
  React = require('react'),
  onClickOutside = require('react-onclickoutside'),
  CalendarContainer = require('./src/CalendarContainer');

var TYPES = React.PropTypes;
var DatetimeSlot = onClickOutside(React.createClass({
  propTypes: {
    // value: TYPES.object | TYPES.string,
    // defaultValue: TYPES.object | TYPES.string,
    onFocus: TYPES.func,
    onBlur: TYPES.func,
    onChange: TYPES.func,
    locale: TYPES.string,
    utc: TYPES.bool,
    input: TYPES.bool,
    // dateFormat: TYPES.string | TYPES.bool,
    // timeFormat: TYPES.string | TYPES.bool,
    inputProps: TYPES.object,
    timeConstraints: TYPES.object,
    viewMode: TYPES.oneOf(['years', 'months', 'days', 'time']),
    isValidDate: TYPES.func,
    open: TYPES.bool,
    strictParsing: TYPES.bool,
    closeOnSelect: TYPES.bool,
    closeOnTab: TYPES.bool,
    searchByTime: TYPES.func
  },

  getDefaultProps: function() {
    var nof = function() {};
    return {
      className: '',
      defaultValue: '',
      inputProps: {},
      input: true,
      onFocus: nof,
      onBlur: nof,
      onChange: nof,
      timeFormat: true,
      timeConstraints: {},
      dateFormat: true,
      strictParsing: true,
      closeOnSelect: false,
      closeOnTab: true,
      utc: false,
      viewMode: 'months'
    };
  },

  getInitialState: function() {
    var state = this.getStateFromProps( this.props );

    if ( state.open === undefined )
      state.open = !this.props.input;

    state.currentStartView = this.props.dateFormat ? (this.props.viewMode || state.updateOn || 'days') : 'time';
    state.currentEndView = state.currentStartView;
    state.viewMode = this.props.viewMode;
    state.searchedViewMode = this.props.viewMode;

    return state;
  },

  getStateFromProps: function( props ) {
    var formats = this.getFormats(props),
      format = formats[props.viewMode],
      startDate = props.startTime, endDate = props.endTime,
      selectedStartDate, selectedEndDate, viewStartDate, viewEndDate, updateOn, inputValue;

    selectedStartDate = this.localMoment( startDate, format );
    selectedEndDate = this.localMoment( endDate, format );
    viewStartDate = selectedStartDate.clone().startOf('month');
    viewEndDate = selectedEndDate.clone().startOf('month');

    updateOn = this.getUpdateOn(format);

    if ( selectedStartDate && selectedEndDate )
      inputValue = selectedStartDate.format(format) + ' -- ' + selectedEndDate.format(format);
    else
      inputValue = '';

    return {
      updateOn: updateOn,
      inputFormat: format,
      viewStartDate: viewStartDate,
      viewEndDate: viewEndDate,
      selectedStartDate: selectedStartDate,
      selectedEndDate: selectedEndDate,
      searchedStartDate: selectedStartDate,
      searchedEndDate: selectedEndDate,
      inputValue: inputValue,
      open: props.open
    };
  },

  getUpdateOn: function( formats ) {
    if ( formats.match('D') ) {
      return 'days';
    }
    else if ( formats.indexOf('MM/YY') !== -1 ) {
      return 'months';
    }
    else if ( formats.indexOf('YYYY') !== -1 ) {
      return 'years';
    }

    return 'days';
  },

  getFormats: function( props ) {
    var formats = {
      years: 'YYYY',
      months: 'MM/YY',
      days: 'DD/MM/YY',
      time: props.dateFormat + ' ' + props.timeFormat
    };

    return formats;
  },

  componentWillReceiveProps: function( nextProps ) {
    var formats = this.getFormats( nextProps ),
      format = formats[nextProps.viewMode],
      updatedState = {};
    updatedState.viewMode = nextProps.viewMode;
    updatedState.searchedViewMode = nextProps.viewMode;

    var currentView = nextProps.viewMode === 'time'? 'days':nextProps.viewMode;
    updatedState.currentStartView = currentView;
    updatedState.currentEndView = currentView;
    updatedState.inputFormat = format;

    var updatedSelectedStartDate = this.localMoment(nextProps.startTime.clone(), format );
    updatedState.selectedStartDate = updatedSelectedStartDate;
    updatedState.viewStartDate = updatedSelectedStartDate;
    updatedState.searchedStartDate = updatedSelectedStartDate;
    var updatedSelectedEndDate = this.localMoment(nextProps.endTime.clone(), format );
    updatedState.selectedEndDate = updatedSelectedEndDate;
    updatedState.viewEndDate = updatedSelectedEndDate;
    updatedState.searchedEndDate = updatedSelectedEndDate;
    updatedState.inputValue = updatedSelectedStartDate.format(format) + ' -- ' + updatedSelectedEndDate.format(format);

    this.setState( updatedState );
  },

  onInputChange: function( e ) {
    var value = e.target === null ? e : e.target.value,
      localMoment = this.localMoment( value, this.state.inputFormat ),
      update = { inputValue: value }
      ;

    if ( localMoment.isValid() && !this.props.value ) {
      update.selectedStartDate = localMoment;
      update.viewDate = localMoment.clone().startOf('month');

      return this.setState( update, function() {
        return this.props.onChange( localMoment.isValid() ? localMoment : this.state.inputValue );
      });
    }
  },

  onInputKey: function( e ) {
    if ( e.which === 9 && this.props.closeOnTab ) {
      this.closeCalendar();
    }
  },

  showView: function( view, startorEnd ) {
    var me = this;
    return function() {
      if (startorEnd) {
        me.setState({ currentStartView: view });
      } else {
        me.setState({ currentEndView: view });
      }
    };
  },

  setDate: function( type, startOrEnd ) {
    var me = this,
      nextViews = {
        month: 'days',
        year: 'months'
      }
      ;
    return function( e ) {
      if (startOrEnd) {
        me.setState({
          viewStartDate: me.state.viewStartDate.clone()[ type ]( parseInt(e.target.getAttribute('data-value'), 10) ).startOf( type ),
          currentStartView: nextViews[ type ]
        });
      } else {
        me.setState({
          viewEndDate: me.state.viewEndDate.clone()[ type ]( parseInt(e.target.getAttribute('data-value'), 10) ).startOf( type ),
          currentEndView: nextViews[ type ]
        });
      }

    };
  },

  addTime: function( amount, type, startOrEnd, toSelected ) {
    return this.updateTime( 'add', amount, type, startOrEnd, toSelected );
  },

  subtractTime: function( amount, type, startOrEnd, toSelected ) {
    return this.updateTime( 'subtract', amount, type, startOrEnd,  toSelected );
  },

  updateTime: function( op, amount, type, startOrEnd, toSelected ) {
    var me = this;

    return function() {
      var update = {}, date;
      if (startOrEnd) {
        date = toSelected ? 'selectedStartDate' : 'viewStartDate';
      } else {
        date = toSelected ? 'selectedEndDate' : 'viewEndDate';
      }
      update[ date ] = me.state[ date ].clone()[ op ]( amount, type );

      me.setState( update );
    };
  },

  allowedSetTime: ['hours', 'minutes', 'seconds', 'milliseconds'],
  setTime: function( type, value, startOrEnd ) {
    var index = this.allowedSetTime.indexOf( type ) + 1,
      state = this.state,
      date = (state.selectedStartDate || state.viewStartDate).clone(),
      nextType
      ;
    if (!startOrEnd) {
      date = (state.selectedEndDate || state.viewEndDate).clone();
    }

    // It is needed to set all the time properties
    // to not to reset the time
    date[ type ]( value );
    for (; index < this.allowedSetTime.length; index++) {
      nextType = this.allowedSetTime[index];
      date[ nextType ]( date[nextType]() );
    }

    if ( !this.props.value ) {
      if(startOrEnd){
        var endDate = date > this.state.selectedEndDate? date.clone() : state.selectedEndDate.clone();
        this.setState({
          selectedStartDate: date,
          selectedEndDate: endDate,
          inputValue: date.format(state.inputFormat) + ' -- ' + endDate.format(state.inputFormat),
        });
      } else {
        this.setState({
          selectedEndDate: date,
          inputValue: state.selectedStartDate.format(state.inputFormat) + ' -- ' + date.format(state.inputFormat),
        });
      }

    }
    this.props.onChange( date );
  },

  updateSelectedDate: function( e, startOrEnd, close ) {
    var target = e.target,
      modifier = 0,
      viewDate,
      currentDate,
      date
      ;

    if (startOrEnd === 'start') {
      viewDate = this.state.viewStartDate;
      currentDate = viewDate;
    } else {
      viewDate = this.state.viewEndDate;
      currentDate = viewDate;
    }
    if (target.className.indexOf('rdtDay') !== -1) {
      if (target.className.indexOf('rdtNew') !== -1)
        modifier = 1;
      else if (target.className.indexOf('rdtOld') !== -1)
        modifier = -1;

      date = viewDate.clone()
        .month( viewDate.month() + modifier )
        .date( parseInt( target.getAttribute('data-value'), 10 ) );
    } else if (target.className.indexOf('rdtMonth') !== -1) {
      date = viewDate.clone()
        .month( parseInt( target.getAttribute('data-value'), 10 ) )
        .date( currentDate.date() );
    } else if (target.className.indexOf('rdtYear') !== -1) {
      date = viewDate.clone()
        .month( currentDate.month() )
        .date( currentDate.date() )
        .year( parseInt( target.getAttribute('data-value'), 10 ) );
    }

    date.hours( currentDate.hours() )
      .minutes( currentDate.minutes() )
      .seconds( currentDate.seconds() )
      .milliseconds( currentDate.milliseconds() );

    if ( !this.props.value ) {
      var open = !( this.props.closeOnSelect && close );
      if ( !open ) {
        this.props.onBlur( date );
      }

      if (startOrEnd === 'start') {
        var endDate = date > this.state.selectedEndDate? date.clone(): this.state.selectedEndDate.clone();
        this.setState({
          selectedStartDate: date,
          selectedEndDate: endDate,
          viewStartDate: date.clone(),
          viewEndDate: endDate.clone(),
          inputValue: date.format(this.state.inputFormat) + ' -- ' + endDate.format(this.state.inputFormat),
          open: open
        });
      } else {
        this.setState({
          selectedEndDate: date,
          viewEndDate: date.clone(),
          inputValue: this.state.selectedStartDate.format(this.state.inputFormat) + ' -- ' + date.format(this.state.inputFormat),
          open: open
        });
      }
    } else {
      if ( this.props.closeOnSelect && close ) {
        this.closeCalendar();
      }
    }

    this.props.onChange( date );
  },

  openCalendar: function() {
    if (!this.state.open) {
      var format = this.state.inputFormat;
      this.setState({ open: true, inputValue: this.state.selectedStartDate.format(format) + ' -- ' + this.state.selectedEndDate.format(format), viewStartDate: this.state.selectedStartDate.clone(),
        viewEndDate: this.state.selectedEndDate.clone() }, function() {
        this.props.onFocus();
      });
    }
  },

  closeCalendar: function() {
    var currentView = this.state.searchedViewMode === 'time'? 'days':this.state.searchedViewMode;
    var format = this.getFormats(this.props)[this.state.searchedViewMode];
    this.setState({ open: false,
      viewMode: this.state.searchedViewMode,
      currentStartView: currentView,
      currentEndView: currentView,
      selectedStartDate: this.state.searchedStartDate.clone(),
      selectedEndDate: this.state.searchedEndDate.clone(),
      inputFormat: format,
      inputValue: this.state.searchedStartDate.clone().format(format) + ' -- ' + this.state.searchedEndDate.clone().format(format)
    }, function () {
      this.props.onBlur( this.state.selectedStartDate || this.state.inputValue );
    });
  },

  handleClickOutside: function() {
    if ( this.state.open && !this.props.open ) {
      this.closeCalendar();
    }
  },

  localMoment: function( date, format, props ) {
    props = props || this.props;
    var momentFn = props.utc ? moment.utc : moment;
    var m = momentFn( date, format, props.strictParsing );
    if ( props.locale )
      m.locale( props.locale );
    return m;
  },
  componentProps: {
    fromProps: ['startTime', 'endTime', 'startTimeLimitation', 'endTimeLimitation', 'isValidDate', 'renderDay', 'renderMonth', 'renderYear', 'timeConstraints'],
    fromState: ['viewStartDate', 'selectedStartDate', 'viewEndDate', 'selectedEndDate', 'updateOn', 'viewMode'],
    fromThis: ['setDate', 'setTime', 'showView', 'addTime', 'subtractTime', 'updateSelectedDate', 'localMoment', 'handleClickOutside']
  },

  getTimeConstraints: function (tag) {
    var timeConstraints = {}, startLimitation, endLimitation;
    startLimitation = this.state.selectedStartDate.clone() || this.props.startTime.clone();
    endLimitation = this.state.selectedEndDate.clone() || this.props.endTime.clone();
    if (moment(endLimitation).startOf('day').isSame(moment(startLimitation).startOf('day'))) {
      if(tag === 'start'){
        if (this.props.startTimeLimitation.isValid() && moment(startLimitation).startOf('day').isSame(moment(this.props.startTimeLimitation).startOf('day'))) {
          timeConstraints.hours = { min : this.props.startTimeLimitation.hours()}
        }
      } else {
        timeConstraints.hours = { min: startLimitation.hours() };
        if (this.props.endTimeLimitation.isValid() && moment(endLimitation).startOf('day').isSame(moment(this.props.endTimeLimitation).startOf('day'))) {
          timeConstraints.hours['max'] = this.props.endTimeLimitation.hours();
        }
      }
    }
    return timeConstraints;
  },

  isValidStartDate: function (currentDate) {
    var cur = moment(currentDate);
    var startMoment = moment(this.props.startTimeLimitation);
    var endMoment =  moment(this.props.endTimeLimitation);
    return cur.isSameOrAfter(startMoment.startOf('day')) && cur.isSameOrBefore(endMoment.startOf('day'));
  },

  isValidEndDate: function(currentDate) {
    var cur = moment(currentDate);
    var startMoment, endMoment;

    if (this.props.startTimeLimitation.isValid() && this.props.endTimeLimitation.isValid()) {
      startMoment = moment(this.props.startTimeLimitation);
      endMoment = this.props.endTimeLimitation > this.state.viewEndDate? moment(this.props.endTimeLimitation) : moment(this.state.viewEndDate);
      return cur.isSameOrAfter(startMoment.startOf('day')) && cur.isSameOrBefore(endMoment.startOf('day'));
    } else {
      startMoment = moment(this.state.viewStartDate)
      return cur.isSameOrAfter(startMoment.startOf('day'));
    }
  },

  getComponentProps: function(tag) {
    var me = this,
      props = {dateFormat: this.props.dateFormat, timeFormat: this.props.timeFormat};

    this.componentProps.fromProps.forEach( function( name ) {
      props[ name ] = me.props[ name ];
    });

    this.componentProps.fromState.forEach( function( name ) {
      props[ name ] = me.state[ name ];
    });
    this.componentProps.fromThis.forEach( function( name ) {
      props[ name ] = me[ name ];
    });
    if (tag === 'start') {
      props[ tag ] = true;
      if (me.props.startTimeLimitation.isValid()) {
        props.isValidDate  = this.isValidStartDate;
        props.timeConstraints  = this.getTimeConstraints('start');
      }
    } else {
      props[ tag ] = false;
      props.timeConstraints  = this.getTimeConstraints('end');
      props.isValidDate  = this.isValidEndDate;
    }
    return props;
  },
  searchDate: function(event) {
    event.preventDefault();
    var me = this;
    me.setState({searchedStartDate: me.state.selectedStartDate.clone(), searchedEndDate: me.state.selectedEndDate.clone(), searchedViewMode:me.state.viewMode}, function() {
      this.closeCalendar();
    });
    this.props.searchByTime(me.state.selectedStartDate.clone(), me.state.selectedEndDate.clone(), me.state.viewMode);

  },


  changeViewMode: function(view) {
    var inputFormat = this.getFormats(this.props)[view];
    var inputValue = this.state.selectedStartDate.format(inputFormat) + ' -- ' + this.state.selectedEndDate.format(inputFormat);
    var currentView = view === 'time'? 'days':view;
    this.setState({ currentStartView: currentView, currentEndView: currentView , viewMode: view, inputFormat: inputFormat, inputValue: inputValue});
  },

  render: function() {
    var DOM = React.DOM,
      className = 'rdt' + (this.props.className ?
          ( Array.isArray( this.props.className ) ?
            ' ' + this.props.className.join( ' ' ) : ' ' + this.props.className) : ''),
      children = [],
      className1 = 'time-box'
      ;

    if ( this.props.input ) {
      children = [ DOM.input( assign({
        key: 'i',
        type: 'text',
        className: 'form-control',
        onFocus: this.openCalendar,
        onChange: this.onInputChange,
        onKeyDown: this.onInputKey,
        value: this.state.inputValue
      }, this.props.inputProps ))];
    } else {
      className += ' rdtStatic';
    }

    if ( this.state.open ) {
      className += ' rdtOpen';
      className1 += ' rdtOpen';
    }
    var that = this;
    return DOM.div({className: className}, children.concat(DOM.div( {className: className1},
      DOM.div({key: 'select-item', className: 'select-item'},
        DOM.span({ key: 'years', className: this.state.viewMode === 'years'? 'item item-selected':'item', onClick: function(event) {
          event.preventDefault();
          that.changeViewMode('years');
        }}, 'Year'),
        DOM.span({ key: 'months', className: this.state.viewMode === 'months'? 'item item-selected':'item', onClick: function(event) {
          event.preventDefault();
          that.changeViewMode('months');
        }}, 'Month'),
        DOM.span({ key: 'days', className: this.state.viewMode === 'days'? 'item item-selected':'item', onClick: function(event) {
          event.preventDefault();
          that.changeViewMode('days');
        }}, 'Day'),
        DOM.span({ key: 'time', className: this.state.viewMode === 'time'? 'item item-selected':'item', onClick: function(event) {
          event.preventDefault();
          that.changeViewMode('time');
        }}, 'Hour')),
      DOM.div({key: 'time-slot', className: 'time-slot'},DOM.div({key: 'left', className: 'left-time-container'},
        DOM.div({ key: 'dt', className: 'rdtPicker start-time' },
          React.createElement( CalendarContainer, {view: this.state.currentStartView, viewProps: this.getComponentProps('start')})),
        DOM.button({className: 'cancel-button', onClick: function(event) {
          event.preventDefault();
          that.closeCalendar();
        }}, 'CANCEL')),
        DOM.div({key: 'right', className: 'right-time-container'},
          DOM.div({ key: 'dt1', className: 'rdtPicker end-time' },
            React.createElement( CalendarContainer, {view: this.state.currentEndView, viewProps: this.getComponentProps('end')})),
          DOM.button({className: 'search-button', onClick: this.searchDate }, 'SEARCH'))
      ))
    ));
  },
}));

// Make moment accessible through the Datetime class fine
DatetimeSlot.moment = moment;

module.exports = DatetimeSlot;