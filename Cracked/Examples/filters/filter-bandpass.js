/**
 * Bandpass Filter
 *
 * @plugin
 * @param {Object} [params] map of optional values
 * @param {Number} [params.frequency=440] frequency
 * @param {Number} [params.q=0] Q
*/

//create & connect white noise and
//bandpass filter with a frequency of 
//1200 and q of 30 to a dac
__().
	white().
	bandpass({
		frequency:1200,
  		q:30
	}).
	dac(.25);

//connect to the previously created white noise and
//create a bandpass filter (with a frequency of 600)
// and connect to output
__("white").bandpass(600).connect("dac");

//connect to the previously created white noise and
//create a bandpass filter (default frequency 440)
// and connect to output
__("white").bandpass().connect("dac");

__("white").start();