'use strict';

var React = require('react'),
	onClickOutside = require('react-onclickoutside')
;

var DOM = React.DOM;
var DateTimeSlotPickerMonths = onClickOutside( React.createClass({
	render: function() {
    var viewDate = this.props.start? this.props.viewStartDate : this.props.viewEndDate
    return DOM.div({ className: 'rdtMonths' }, [
			DOM.table({ key: 'a' }, DOM.thead( {}, DOM.tr( {}, [
				DOM.th({ key: 'prev', className: 'rdtPrev' }, DOM.span({ onClick: this.props.subtractTime( 1, 'years', this.props.start )}, '‹' )),
				DOM.th({ key: 'year', className: 'rdtSwitch', onClick: this.props.showView( 'years', this.props.start ), colSpan: 2, 'data-value': viewDate.year() }, viewDate.year() ),
				DOM.th({ key: 'next', className: 'rdtNext' }, DOM.span({ onClick: this.props.addTime( 1, 'years', this.props.start )}, '›' ))
			]))),
			DOM.table({ key: 'months' }, DOM.tbody({ key: 'b' }, this.renderMonths()))
		]);
	},

	renderMonths: function() {
		var date = this.props.start? this.props.selectedStartDate.clone() : this.props.selectedEndDate.clone(),
      viewDate = this.props.start? this.props.viewStartDate : this.props.viewEndDate,
			month = viewDate.month(),
			year = viewDate.year(),
			rows = [],
			i = 0,
			months = [],
			renderer = this.props.renderMonth || this.renderMonth,
			isValid = this.props.isValidDate || this.alwaysValidDate,
			classes, props, currentMonth, isDisabled, noOfDaysInMonth, daysInMonth, validDay,
			// Date is irrelevant because we're only interested in month
			irrelevantDate = 1
		;

		while (i < 12) {
			classes = 'rdtMonth';
			currentMonth = viewDate.clone().set({ year: year, month: i, date: irrelevantDate });

			noOfDaysInMonth = currentMonth.endOf( 'month' ).format( 'D' );
			daysInMonth = Array.from({ length: noOfDaysInMonth }, function( e, i ) {
				return i + 1;
			});

			validDay = daysInMonth.find(function( d ) {
				var day = currentMonth.clone().set( 'date', d );
				return isValid( day );
			});

			isDisabled = ( validDay === undefined );

			if ( isDisabled )
				classes += ' rdtDisabled';

			if ( date && i === month && year === date.year() )
				classes += ' rdtActive';

			props = {
				key: i,
				'data-value': i,
				className: classes
			};

			if ( !isDisabled )
				props.onClick = ( this.props.viewMode === 'months' ?
					this.updateSelectedMonth : this.props.setDate( 'month', this.props.start ) );

			months.push( renderer( props, i, year, date && date.clone() ) );

			if ( months.length === 4 ) {
				rows.push( DOM.tr({ key: month + '_' + rows.length }, months ) );
				months = [];
			}

			i++;
		}

		return rows;
	},

  updateSelectedMonth: function( event ) {
    if (this.props.start) {
      this.props.updateSelectedDate( event, 'start' );
    } else {
      this.props.updateSelectedDate( event, 'end' );
    }
  },

	renderMonth: function( props, month ) {
		var localMoment = this.props.start? this.props.viewStartDate.clone() : this.props.viewEndDate.clone();
		var monthStr = localMoment.localeData().monthsShort( localMoment.month( month ) );
		var strLength = 3;
		// Because some months are up to 5 characters long, we want to
		// use a fixed string length for consistency
		var monthStrFixedLength = monthStr.substring( 0, strLength );
		return DOM.td( props, capitalize( monthStrFixedLength ) );
	},

	alwaysValidDate: function() {
		return 1;
	},

  handleClickOutside: function() {
    // this.props.handleClickOutside();
  }
}));

function capitalize( str ) {
	return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
}

module.exports = DateTimeSlotPickerMonths;
