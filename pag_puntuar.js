/* JQuery after-load functions */


function load_puntuar_items(save_state){
	$("form").submit(function(e) {
		e.preventDefault();
	});

	updateGeneral();

	/*$("#review-airline-text-input").autocomplete({
		source: function( request, response ) {
			var airlines = getAirlinesFromAPI(request.term);
			$.when(airlines).done(function(my_response){
				response(getAirlinesNames(my_response.airlines))
			})
		}
	});*/

	$(".mark").on('change', function() {
		updateGeneral();
	});

	$("#modifiable-great-panel").ready(function(){
		if (save_state){
			saveScorePageState("Puntuar","","puntuar");
		}
	});

}

/* Ajax Request */
var getAirlinesFromAPI = function(source){
	return $.ajax({
		url: "http://hci.it.itba.edu.ar/v1/api/misc.groovy?method=getairlinesbyname",
		data: {
			name : source
		},
		dataType: "json",
	});

}

function getAirlinesNames(data){
	var answer = [];

	if ( data.length == 0 ){
		answer.push("No se encontraron resultados");
	}

	for ( i = 0; i < data.length ; i++ ){
		if (data[i].name != undefined){
			answer.push(decodeURI(data[i].name));
		}else{
			answer.push(decodeURI(data[i].description));
		}
	}

  return answer;
}

function getAirlineId(data) {
	if (data[0].id != undefined) {
		return decodeURI(data[0].id);
	}
	return "";
}

function submitReviewForm() {
	var data_for_request_ok = true;
	var airline_id;
	$(".alert").empty();
	$(".alert").hide();

	flight = JSON.parse(sessionStorage.getItem("toScoreFlight"));

	if (flight.outbound_routes != undefined){
		airline_id = flight.outbound_routes[0].segments[0].airline.id;
	}else{
		airline_id = flight.airline.id
	}

			var flight_number = $('#review-flight-number-information').text();

			var overall = document.forms["submitReview"]["review"]
			var friendliness = document.forms["submitReview"]["review-friendliness"].value;
			var punctuality = document.forms["submitReview"]["review-punctuality"].value;
			var food = document.forms["submitReview"]["review-food"].value;
			var comfort = document.forms["submitReview"]["review-comfort"].value;
			var mileage_program = document.forms["submitReview"]["review-mileage-program"].value;
			var quality_price = document.forms["submitReview"]["review-quality-price"].value;
			var comments = document.forms["submitReview"]["review-comment-text-input"].value;

			var yes_recommend = $("#review-recommend-yes").prop("checked");

			var options = {
				flight: {
					airline: {
						id: airline_id
					},
					number: parseInt(flight_number, 10)
				},
				rating: {
					friendliness: parseInt(friendliness, 10),
					food: parseInt(food, 10),
					punctuality: parseInt(punctuality, 10),
					mileage_program: parseInt(mileage_program, 10),
					comfort: parseInt(comfort, 10),
					quality_price: parseInt(quality_price, 10)
				},
				yes_recommend: yes_recommend,
				comments: comments
			};
			/*var baba2 =
				{
					flight: {
						airline: {
							id: airline_id
						},
						number: flight_number,
					},
					rating: {
						friendliness: friendliness,
						food: food,
						punctuality: punctuality,
						mileage_program: mileage_program,
						comfort: comfort,
						quality_price: quality_price,
					},
					yes_recommend: yes_recommend,
					comments: comments
				};*/

			var submit = $.ajax({
				//type: 'POST',
				//contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				url: "http://hci.it.itba.edu.ar/v1/api/review.groovy?method=reviewairline2",
				data: {
					review : encodeURIComponent(JSON.stringify(options)).replace(/%3A/g,':').replace(/%2C/g,',')
			},
			});
			$.when(submit).done(function(my_response){
		    	if (my_response.error == undefined ){
		      	fillError("#success-alert","La operación se realizó exitosamente.");
		      	return;
		    	}else{
						fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
						return;
					}
			});

	}

function checkFlightNumber(number) {
	var number_string = number.toString();
	var number_size = number.length;
	if (isNaN(new Number(number_string))) {
		return false;
	}
	return true;
}

function fillError(selector,text){
  $(selector).empty();
  $(selector).html(text);
  $(selector).show();
}

function updateGeneral() {
	var acum = 0;
	var marks = ["friendliness", "punctuality", "food", "comfort", "mileage-program", "quality-price"];
	for (i = 0; i < 6; i++) {
		var mark = new Number(document.getElementById("review-" + marks[i]).value);
		acum += mark;
	}
	acum = acum / 6;
	acum = acum.toFixed(2);
	document.getElementById("review-general-rating").value = acum;
	acum = 0;
}

function checkSpecialCharacters(string) {
    var pattern = new RegExp(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/); //unacceptable chars
    if (pattern.test(string)) {
        return false;
    }
    return true; //good user input
}

function saveScorePageState(title,url,page_name){
  var data = {
    offer_html: $("#modifiable-great-panel").html(),
    last_url: ""+ window.location.pathname,
    page: page_name,
		score_flight: sessionStorage.getItem("toScoreFlight")
  };
  history.pushState(data,title,url);
}

function puntuarPageButton(number){

	$("#breadcrumb-ol").hide();
	var load_template = $.ajax({
				url: "./template_puntuar.html",
				dataType: "text"
			});

	check_flight = JSON.parse(sessionStorage.getItem("review-data")).reviews[number].flight;
	sessionStorage.setItem("toScoreFlight",JSON.stringify(check_flight));
	var get_name = $.ajax({
    url: "http://hci.it.itba.edu.ar/v1/api/misc.groovy?method=getairlinebyid",
    data: {
      id: check_flight.airline.id
    },
    dataType: "json"
  });
	$.when(get_name).done(function(response){
		if (response == undefined || response.airline == undefined){
			fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
			return;
		}
		var options = {
			Numero: check_flight.number,
			Aerolinea: response.airline.name
		}

		$.when(load_template).done(function(template){
			var rendered = Mustache.render(template, options);
			$("#modifiable-great-panel").html(rendered);
			$("#modifiable-great-panel").ready(function() {
				$("#review-info-vuelo-panel-mini").show();
				$("#review-info-vuelo-panel").hide();
				load_puntuar_items(true);
			});
		});
	})

}
