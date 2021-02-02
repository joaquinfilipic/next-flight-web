/* JQuery after-load functions */
/*$("document").ready(function() {

	load_items_opinions();

} );*/

function load_items_opinions(save_state){
	$("form").submit(function(e) {
		e.preventDefault();
	});

	$("#airline-text-input").autocomplete({
		source: function( request, response ) {
			var airlines = getAirlinesFromAPI(request.term);
			$.when(airlines).done(function(my_response){
				response(getAirlinesNames(my_response.airlines))
			})
		}
		});

	$(".radio-option").on('change', function() {
		var value1 = $("#airline-radio").prop("checked");
		var value2 = $("#flight-number-radio").prop("checked");

		if ( value1 ) {
			$("#flight-number-text-input").prop("disabled", true);
			$("#airline-text-input").prop("disabled", false);
		}else if (value2) {
			$("#flight-number-text-input").prop("disabled", false);
			$("#airline-text-input").prop("disabled", true);
		}
	});

	$(".sort").on('click', function() {
  		var data = JSON.parse(sessionStorage.getItem("review_data"));
  		fillReviews(data);
  	});

	if (save_state){
		savePageState("Opiniones","pag_opiniones.html","opiniones");
	}
}

function submitOpinionForm() {
	var value = $("#airline-radio").prop("checked");
	var airline_id;
	var flight_number;
	$(".alert").empty();
	$(".alert").hide();
	$("#ascendant-flight-number-sort-div").hide();
	$("#descendant-flight-number-sort-div").hide();

	$("#opinion-sort-box").show();
	$("#opinion-list-box").show();
	$("#ascendant-rating-sort-div").show();
	$("#descendant-rating-sort-div").show();
	if (value) {
		$("#ascendant-flight-number-sort-div").show();
		$("#descendant-flight-number-sort-div").show();

		var airline_input = document.forms["submitOpinion"]["airline-text-input"].value;
		if (airline_input == "") {
			fillError("#wrong-airline", "Debe ingresar una aerolínea o el número de vuelo.");
			return;
		}
		if (!checkSpecialCharacters(airline_input)) {
			fillError("#wrong-airline", "Contiene caracteres inválidos.");
			return;
		}
		var airlines_data = getAirlinesFromAPI(airline_input);
		$.when(airlines_data).done(function(my_response){
			var airlines_names = getAirlinesNames(my_response.airlines);
			if (airlines_names.length == 0 || airlines_names.length >= 2 || !(airline_input === airlines_names[0])) {
				fillError("#wrong-airline", "La aerolínea solicitada no existe.");
			}
			else {
				airline_id = getAirlineId(my_response.airlines);
				var review_list = getReviewsFromAPI(airline_id, flight_number);
				$.when(review_list).done(function(data,success){
					sessionStorage.setItem("review_data",JSON.stringify(data));
					if (success != "success") {
        				//fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
        				return;
        			}
        			fillReviews(data);
				});
			}
		});
	}
	else {
		flight_number = document.forms["submitOpinion"]["flight-number-text-input"].value;
		if (flight_number.length > 4) {
			fillError("#wrong-flight-number", "El número de vuelo debe tener entre 1 y 4 dígitos.");
			return;
		}
		else if (!checkFlightNumber(flight_number)) {
			fillError("#wrong-flight-number", "Debe ingresar un número.");
			return;
		}
		var review_list = getReviewsFromAPI(airline_id, flight_number);
		$.when(review_list).done(function(data,success){
			if (success != "success") {
        		//fillError("#unknown-error","Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
        		return;
        	}
        	fillReviews(data);
		});
	}
}

function getReviewsFromAPI(var_id, var_flight_number){
	if (var_id == undefined) {
		return $.ajax({
    		url: "http://hci.it.itba.edu.ar/v1/api/review.groovy?method=getairlinereviews",
    		data: {
				flight_number: var_flight_number,
			},
			dataType: "json",
		});
	}
	if (var_flight_number == undefined) {
		return $.ajax({
    		url: "http://hci.it.itba.edu.ar/v1/api/review.groovy?method=getairlinereviews",
    		data: {
				airline_id: var_id
			},
			dataType: "json",
		});
	}
}

function fillReviews(data) {
	sessionStorage.setItem("review-data",JSON.stringify(data));
	if (data.reviews.length == 0){
    	$("#opinion-list").prepend("<div class='alert alert-info'><a href=''#' class='close' data-dismiss='alert' aria-label='close'>&times;</a>No se encontraron resultados.</div>")
			saveReviewState("Opiniones","pag_opiniones.html");
	}
  	else{
		$("#opinion-list").empty();
    	var request_template = $.ajax({
			dataType: 'text',
			url: './opinion_template.html',
		});

		var ascendant_flight_number_sort = $("#ascendant-flight-number-sort").prop("checked");
		var descendant_flight_number_sort = $("#descendant-flight-number-sort").prop("checked");
		var ascendant_rating_sort = $("#ascendant-rating-sort").prop("checked");
		var descendant_rating_sort = $("#descendant-rating-sort").prop("checked");

		var values = [ascendant_flight_number_sort, descendant_flight_number_sort, ascendant_rating_sort, descendant_rating_sort];
		var functions = [ascendantFlightNumberCmp, descendantFlightNumberCmp, ascendantRatingCmp, descendantRatingCmp];
		for (i = 0; i < functions.length; i++) {
			if (values[i] == true) {
				reviewSort(data, functions[i]);
			}
		}

    	$.when(request_template).done(function(template_data,success,err){
			for( i = 0 ; i < data.reviews.length ; i++ ){
				var id = data.reviews[i].flight.airline.id;
				var flight_number = data.reviews[i].flight.number;
				var rating = data.reviews[i].rating.overall;
				var friendliness = data.reviews[i].rating.friendliness;
				var punctuality = data.reviews[i].rating.punctuality;
				var food = data.reviews[i].rating.food;
				var comfort = data.reviews[i].rating.comfort;
				var mileage_program = data.reviews[i].rating.mileage_program;
				var quality_price = data.reviews[i].rating.quality_price;
				var yes_recommend;
				if (data.reviews[i].yes_recommend)
					yes_recommend = "Sí";
				else
					yes_recommend = "No";
				var comments = $('<textarea/>').html(decodeURI(data.reviews[i].comments)).text();

				var options = {
					NombreAerolinea: id,
					NumeroVuelo: flight_number,
					PuntuacionGeneral: rating,
					Amabilidad: friendliness,
					Puntualidad: punctuality,
					Comida: food,
					Comfort: comfort,
					ViajerosFrecuentes: mileage_program,
					PrecioCalidad: quality_price,
					Recomendaria: yes_recommend,
					Comentario: comments,
					Number: i
				}
				var rendered = Mustache.render(template_data, options);
        		$('#opinion-list').append(rendered);

        		$('.review-detail-class:last').attr('href','#review-detail-' + i);
        		$('.review-detail-block-class:last').attr('id','review-detail-' + i);

			}
			saveReviewState("Opiniones","pag_opiniones.html");
    	});
	}
}

/* Ajax Request */
function getAirlinesFromAPI(input){
	return $.ajax({
		url: "http://hci.it.itba.edu.ar/v1/api/misc.groovy?method=getairlinesbyname",
		data: {
			name: input
		},
		dataType: "json",
	});
}

function getAirlinesNames(airlines){
	var answer = [];

	if ( airlines.length == 0 ){
		answer.push("No se encontraron resultados.");
	}

	for ( i = 0; i < airlines.length ; i++ ){
		if (airlines[i].name != undefined){
			answer.push(decodeURI(airlines[i].name));
		}
	}

  return answer;
}

function getAirlineDataById(iddata) {
	return $.ajax({
		url: "http://hci.it.itba.edu.ar/v1/api/misc.groovy?method=getairlinesbyid",
		data: {
			id: iddata
		},
		dataType: "json",
	});
}

function getAirlineId(airlines) {
	return decodeURI(airlines[0].id);
}

function checkFlightNumber(number) {
	var number_string = number.toString();
	var number_size = number.length;
	if (isNaN(new Number(number_string))) {
		return false;
	}
	return true;
}

function checkSpecialCharacters(string) {
    var pattern = new RegExp(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\:<>\?]/); //unacceptable chars
    if (pattern.test(string)) {
			return false;
    }
    return true; //good user input
}

function saveReviewState(title,url){
	var data = {
    offer_html: $("#modifiable-panel").html(),
    offer_all_panel: $("#modifiable-great-panel").html(),
    last_url: ""+ window.location.pathname,
    page: "opiniones-result",
		review_data: sessionStorage.getItem("review-data")
  };
  history.pushState(data,title,url);
}

function reviewSort(data, comparator) {
	var lowest_review;
	var lowest_index;
	var aux;
	for (i = 0; data.reviews[i] != undefined; i++) {
		lowest_review = data.reviews[i];
		lowest_index = i;
		for (j = i; data.reviews[j] != undefined; j++) {
			if (comparator(data.reviews[j], lowest_review)) {
				lowest_review = data.reviews[j];
				lowest_index = j;
			}
		}
		aux = data.reviews[i];
		data.reviews[i] = data.reviews[lowest_index];
		data.reviews[lowest_index] = aux;
	}
	return data;
}

function ascendantFlightNumberCmp (review1, review2) {
	if (review1.flight.number < review2.flight.number) {
		return true;
	}
	return false;
}

function descendantFlightNumberCmp (review1, review2) {
	if (review1.flight.number > review2.flight.number) {
		return true;
	}
	return false;
}

function ascendantRatingCmp (review1, review2) {
	if (review1.rating.overall < review2.rating.overall) {
		return true;
	}
	return false;
}

function descendantRatingCmp (review1, review2) {
	if (review1.rating.overall > review2.rating.overall) {
		return true;
	}
	return false;
}
