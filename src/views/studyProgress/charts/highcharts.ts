import Highcharts from 'highcharts'
// The extra chart types (heatmap, bubble) register themselves onto the core, so
// they must be imported *after* it. Everything that draws a chart imports
// Highcharts from here rather than from 'highcharts' directly — a side-effect
// import in a consumer file would be hoisted above the core's own import and
// blow up with "Cannot read properties of undefined (reading 'Axis')".
import 'highcharts/modules/heatmap'
import 'highcharts/highcharts-more'

export default Highcharts
