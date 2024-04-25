let windSpeed = 0
let sunriseDate
let sunsetDate

function getJobByMethodName(method, jobs)
{
  print('jobs', JSON.stringify(jobs))
  for (let i in jobs) {
    print('job', JSON.stringify(jobs[i]))
    if(jobs[i].calls[0].params.code === method)
      return jobs[i]
  }
  return undefined
}

function createSchedule(hour, minute, action)
{
  Shelly.call(
    "Schedule.Create",
    {
      enable: true,
      timespec: "0 " + minute + " " + hour + " * * SUN,MON,TUE,WED,THU,FRI,SAT",
      calls: [
        {
          method: "script.eval",
          params: {
            id: Shelly.getCurrentScriptId(),
            code: action,
          },
        },
      ],
    },
    function (result) {
      print('Successfuly created schedule ', result)
    }
  );
}

function updateSchedule(id, hour, minute, action)
{
  Shelly.call(
    "Schedule.Update",
    {
      id: id,
      enable: true,
      timespec: "0 " + minute + " " + hour + " * * SUN,MON,TUE,WED,THU,FRI,SAT",
      calls: [
        {
          method: "script.eval",
          params: {
            id: Shelly.getCurrentScriptId(),
            code: action,
          },
        },
      ],
    },
    function (result) {
      print('Successfuly updated schedule ', result)
    }
  );
}

function installSchedule(hour, minute, action) {
  print('Install schedule')
  Shelly.call(
    "Schedule.list",
    null,
    function (result) {
      print(result)
      print('Schedule list', JSON.stringify(result))
      let job = getJobByMethodName(action, result.jobs)
      if(job === undefined)
      {
        createSchedule(hour, minute, action)
      }
      else 
      {
        updateSchedule(job.id, hour, minute, action)
      }
    }
  )
  
}

installSchedule('1', '2', 'schedule()')

function msFromNowToDate(now, date) {
  const timeTo = new Date(date).getTime()
  return Math.floor((timeTo - now))
}

function sunsetAction() {
   print('Sunset')
   var current_pos = Shelly.getComponentStatus("cover:0").current_pos;
   if(windSpeed < 10 && current_pos != 0) Shelly.call("Cover.close", {'id': 0})
 }
 
function sunriseAction() {
  print('Sunrise')
  var current_pos = Shelly.getComponentStatus("cover:0").current_pos;
  if(current_pos == 0) Shelly.call("Cover.GoToPosition", {'id': 0, 'pos': 4})
}

function weatherAction() {
  Shelly.call(
  "HTTP.GET", {
    "url": "https://api.tomorrow.io/v4/weather/realtime?location=x,y&apikey=putyourapikey",
  },
  function(result) {
    print(result.body)
    const data = JSON.parse(result.body).data.values    
    print(data.windSpeed)
    windSpeed = data.windSpeed
    
    var current_pos = Shelly.getComponentStatus("cover:0").current_pos;
    
    const currentHour = new Date().getHours();
    if((windSpeed >= 10 ||
    (data.cloudCover < 50 && 
    currentHour >= 12 && 
    currentHour < sunsetDate.getHours() && 
    data.temperature < 25))
    && current_pos < 100
    )
    {
      Shelly.call("Cover.open", {'id': 0});
    }
    
    if(current_pos == 100 && 
    windSpeed < 5 && 
    (currentHour > sunsetDate.getHours() || 
    currentHour < sunriseDate.getHours()))
    {
      Shelly.call("Cover.close", {'id': 0});
    }
  }
  );
};

function schedule() {
      print('schedule')
	  Shelly.call(
	  "HTTP.GET", {
		"url": "https://api.sunrise-sunset.org/json?lat=x&lng=y&formatted=0",
	  },
	  function(result) {
			print('result:', result)
			const data = JSON.parse(result.body).results
			print("Sunrise ", data.sunrise);
			print("Sunset ", data.sunset);
			
			sunriseDate = new Date(data.sunrise)
			installSchedule(sunriseDate.getHours(), sunriseDate.getMinutes(), 'sunriseAction()')
			
			sunsetDate = new Date(data.sunset)
			installSchedule(sunsetDate.getHours(), sunsetDate.getMinutes(), 'sunsetAction()')
        }
	);
}

schedule()

installSchedule('*','*/5','weatherAction()')
