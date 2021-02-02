/* JQuery after-load functions */

function load_information_items(save_state,load_all){
	$("form").submit(function(e) {
		e.preventDefault();
	});

		var countries_list = getCountriesFromAPI();
		$.when(countries_list).done(function(my_response) {
			var country_names = getCountriesNames(my_response.countries);
			if (country_names.length == 0) {
				fillError("#wrong-country", "Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
				return;
			}
			for (i = 0; i < country_names.length; i++) {
				$("#country-option-input").append( "<option>" + country_names[i] + "</option>" );
			}
			sessionStorage.setItem("countries_list",JSON.stringify(my_response.countries));
		})

		$("#city-text-input").autocomplete({
		source: function( request, response ) {
			var cities_list = getCitiesFromAPI(request.term);
			$.when(cities_list).done(function(my_response){
				response(getCitiesNames(my_response.cities))
			})
		}
		});

		$("#add-phone").on('click', function() {
			var phone_count = parseInt($(this).attr("data-value"));
			if (phone_count < 5) {
				$(this).before("<div class=\"form-group row\"><label for=\"contact-phone-text-input\" class=\"col-xs-3 control-label\">Teléfono:</label><div class=\"col-xs-4\"><input class=\"form-control\" id=\"phone-number-" + phone_count.toString() + "\"></div></div>");
				$(this).attr("data-value", (phone_count + 1).toString());
				return;
			}
			$(this).prop("disabled", true);
			fillError("#warning-phones", "Se aceptan hasta 5 números de teléfono.");
		});

		var flight_data = JSON.parse(sessionStorage.getItem("flight_data_global"));

		if (!load_all){
			fillPassengers(flight_data,save_state);
		}
		loadTextInfo(load_all);
}

function submitDataForm() {
	var data_for_request_ok = true;

	var data = JSON.parse(sessionStorage.getItem("flight_data_global"));

	var adults = JSON.parse(data.adults);
	var children = JSON.parse(data.children);
	var infants = JSON.parse(data.infants);
	var total_passengers_count = adults + children + infants;

	var personal_data = new Object();

	personal_data.passenger_names = [];
	personal_data.passenger_surnames = [];
	personal_data.passenger_id_types = [];
	personal_data.passenger_id_numbers = [];
	personal_data.passenger_birth_dates = [];
	for (i = 0; i < total_passengers_count; i++) {
		personal_data.passenger_names[i] = document.forms["submitData"]["passenger-name-text-input-" + (i+1)].value;
		personal_data.passenger_surnames[i] = document.forms["submitData"]["passenger-surname-text-input-" + (i+1)].value;
		personal_data.passenger_id_types[i] = document.forms["submitData"]["passenger-id-type-option-input-" + (i+1)].value;
		personal_data.passenger_id_numbers[i] = document.forms["submitData"]["passenger-id-number-text-input-" + (i+1)].value;
		personal_data.passenger_birth_dates[i] = document.forms["submitData"]["passenger-birth-date-text-input-" + (i+1)].value;
	}

	personal_data.owner_name = document.forms["submitData"]["card-owner-name-text-input"].value;
	personal_data.owner_surname = document.forms["submitData"]["card-owner-surname-text-input"].value;
	personal_data.card_number = document.forms["submitData"]["card-number-text-input"].value;
	personal_data.exp_date = document.forms["submitData"]["card-expiration-text-input"].value;
	personal_data.sec_code = document.forms["submitData"]["card-security-code-text-input"].value;

	var billing_address_country = document.forms["submitData"]["country-option-input"].value;
	var billing_country_id;
	var countries_list = sessionStorage.getItem("countries_list");
	countries_list = JSON.parse(countries_list);
	for (j = 0; j < countries_list.length; j++) {
		var country = decodeURI(countries_list[j].name);
		if (billing_address_country === country) {
			var id = decodeURI(countries_list[j].id);
			billing_country_id = id;
		}
	}
	sessionStorage.setItem("billing_country_id",JSON.stringify(billing_country_id));
	var billing_address_city = document.forms["submitData"]["city-text-input"].value;

	personal_data.country = document.forms["submitData"]["country-option-input"].value;
	personal_data.state = document.forms["submitData"]["state-text-input"].value;
	personal_data.city = document.forms["submitData"]["city-text-input"].value;
	personal_data.zip_code = document.forms["submitData"]["zip-code-text-input"].value;
	personal_data.street = document.forms["submitData"]["street-text-input"].value;
	personal_data.door_number = document.forms["submitData"]["door-number-text-input"].value;
	personal_data.floor = document.forms["submitData"]["floor-text-input"].value;
	personal_data.apartment = document.forms["submitData"]["apartment-text-input"].value;

	personal_data.email = document.forms["submitData"]["contact-email-text-input"].value;
	personal_data.phone_count = parseInt($("#add-phone").attr("data-value"));
	personal_data.phone_list = [];

	for (i = 0; i < personal_data.phone_count; i++) {
		personal_data.phone_list[i] = document.forms["submitData"]["phone-number-" + i].value;
	}


	/*
	personal_data.owner_name = getFirstWord(owner_name);
	personal_data.owner_surname = getFirstWord(owner_surname);*/

	$(".alert").empty();
	$(".alert").hide();

	/* Validate passenger info */
	for (i = 0; i < total_passengers_count; i++) {
		if (!validatePassengerName(personal_data.passenger_names[i], i + 1)) {
			data_for_request_ok = false;
		}
		if (!validatePassengerSurname(personal_data.passenger_surnames[i], i + 1)) {
			data_for_request_ok = false;
		}
		if (!validatePassengerIdNumber(personal_data.passenger_id_numbers[i], personal_data.passenger_id_types[i], i + 1)) {
			data_for_request_ok = false;
		}
		if (!validatePassengerBirthDate(personal_data.passenger_birth_dates[i], i + 1)) {
			data_for_request_ok = false;
		}
	}

	/* Validate credit card data */
	if (!validateName(personal_data.owner_name)) {
		data_for_request_ok = false;
	}
	if (!validateSurname(personal_data.owner_surname)) {
		data_for_request_ok = false;
	}
	if (!validateCreditCard(personal_data.card_number)) {
		data_for_request_ok = false;
	}
	if (!validateExpDate(personal_data.exp_date)) {
		data_for_request_ok = false;
	}
	if (!validateSecCode(personal_data.sec_code)) {
		data_for_request_ok = false;
	}

	/* Validate bill address data */
	if (personal_data.country.length == 0) {
		fillError("wrong-country", "Este campo es obligatorio.");
		data_for_request_ok = false;
	}
	if (!validateState(personal_data.state)) {
		data_for_request_ok = false;
	}
	if (!validateCity(personal_data.city)) {
		data_for_request_ok = false;
	}
	if (!validateZip(personal_data.zip_code)) {
		data_for_request_ok = false;
	}
	if (!validateStreet(personal_data.street)) {
		data_for_request_ok = false;
	}
	if (!validateDoorNumber(personal_data.door_number)) {
		data_for_request_ok = false;
	}
	if (personal_data.floor.length != 0 && !validateFloor(personal_data.floor)) {
		data_for_request_ok = false;
	}
	if (personal_data.apartment.length != 0 && !validateApartment(personal_data.apartment)) {
		data_for_request_ok = false;
	}

	/* Validate contact data */
	if (!validateEmail(personal_data.email)) {
		data_for_request_ok = false;
	}
	if (!validatePhones(personal_data.phone_list)) {
		data_for_request_ok = false;
	}

	var credit_card_object={
		number: personal_data.card_number,
		exp_date: personal_data.exp_date,
		sec_code: personal_data.sec_code
	};

if (data_for_request_ok) {

	var checkCreditCard = creditCardValidation(credit_card_object);

	$.when(checkCreditCard).done(function(response){

		if (response==undefined){
			fillError("#wrong-card-data", "Ahora no se pudo realizar la solicitud. Por favor, intentelo más tarde.");
			return;
		}else if(response.error != undefined){
			if(response.error.code == 106){
				fillError("#wrong-card-number", "Número inválido.");
			}else if(response.error.code == 107){
				fillError("#wrong-card-exp-date", "Fecha inválida.");
			}else if(response.error.code == 108){
				fillError("#wrong-card-code", "Código de seguridad inválido.");
			}
			return;
		}

			changeBreadCrumb("#bc-validation");
			sessionStorage.setItem("personal_data",JSON.stringify(personal_data));
			saveTextInfo(personal_data);
			load_detalle_compra();

		//fillError("#wrong-country", "Ocurrió un error");
		//return;
	});
}


}

/* Ajax Request */
var getCountriesFromAPI = function(){
	return $.ajax({
		url: "http://hci.it.itba.edu.ar/v1/api/geo.groovy?method=getcountries",
		dataType: "json",
	});
}

function getCountriesNames(data){
	var answer = [];

	for ( i = 0; i < data.length ; i++ ){
		if (data[i].name != undefined) {
			answer.push(decodeURI(data[i].name));
		}
	}

  return answer;
}

/* Ajax Request */
var getCitiesFromAPI = function(source){
	return $.ajax({
		url: "http://hci.it.itba.edu.ar/v1/api/geo.groovy?method=getcitiesbyname",
		data: {
			name : source
		},
		dataType: "json",
	});
}

function getCitiesNames(data){
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


function getFirstWord(string) {
	var resp = "";
	for (i = 0; i < string.length; i++) {
		resp = resp + string.charAt(i);
		if (string.charAt(i) == " ")
			return resp;
	}
	return resp;
}

function checkSpecialCharacters(string) {
    var pattern = new RegExp(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\:<>\?]/); //unacceptable chars
    if (pattern.test(string)) {
		return false;
    }
    return true; //good user input
}

function hasNumber(string) {
 	return (/\d/.test(string));
}

function fillPassengers(data,save_state) {
    var request_template = $.ajax({
		dataType: 'text',
		url: './passenger_template.html',
	});

    $.when(request_template).done(function(template_data,success,err){
    	var passenger_type = ["Adult", "Children", "Infant"];
    	var adults = JSON.parse(data.adults);
    	var children = JSON.parse(data.children);
    	var infants = JSON.parse(data.infants);
    	var total_passengers = adults + children + infants;
    	var total_passengers_count = 0;

    	var adult_count = 0;
    	var children_count = 0;
    	var infant_count = 0;

		for( i = 0 ; i < total_passengers; i++ ){
			var passenger_type;
			if (adults > 0) {
				adult_count += 1;
				adults = adults - 1;
				passenger_type = "Adulto";
				if (adults >= 0) {
					passenger_type += " "+adult_count;
				}
			}
			else if (children > 0) {
				children_count += 1;
				children = children - 1;
				passenger_type = "Niño";
				if (children >= 0) {
					passenger_type += " "+children_count;
				}
			}
			else if (infants > 0) {
				infant_count += 1;
				infants = infants - 1;
				passenger_type = "Infante";
				if (infants >= 0) {
					passenger_type += " "+infant_count;
				}
			}
			total_passengers_count += 1;
			var num = (i+1).toString();
			var options = {
				PassengerType: passenger_type
			};
			var rendered = Mustache.render(template_data, options);
        	$('#passengers-info').append(rendered);

        	$('.passenger-name:last').attr('id','passenger-name-text-input-' + total_passengers_count);
        	$('.wrong-name-class:last').attr('id','wrong-passenger-name-' + total_passengers_count);

        	$('.passenger-surname:last').attr('id','passenger-surname-text-input-' + total_passengers_count);
        	$('.wrong-surname-class:last').attr('id','wrong-passenger-surname-' + total_passengers_count);

        	$('.passenger-id-type:last').attr('id','passenger-id-type-option-input-' + total_passengers_count);

        	$('.passenger-id-number:last').attr('id','passenger-id-number-text-input-' + total_passengers_count);
        	$('.wrong-id-number-class:last').attr('id','wrong-passenger-id-number-' + total_passengers_count);

        	$('.passenger-birth-date:last').attr('id','passenger-birth-date-text-input-' + total_passengers_count);
        	$('.wrong-birth-date-class:last').attr('id','wrong-passenger-birth-date-' + total_passengers_count);
			}

			$("#modifiable-great-panel").ready(function(){
				if (save_state){
					savePageState("Ingresar Datos","","info");
				}
			});

    });


}

/* Validate passenger's info functions */
function validatePassengerName(string, number) {
	if (string.length == 0) {
		fillError("#wrong-passenger-name-"+number, "Este campo es obligatorio.");
		return false;
	}
	if (string.length > 80) {
		fillError("#wrong-passenger-name-"+number, "El nombre supera el límite de 80 caracteres.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-passenger-name-"+number, "Contiene caracteres inválidos.");
		return false;
	}
	return true;
}

function validatePassengerSurname(string, number) {
	if (string.length == 0) {
		fillError("#wrong-passenger-surname-"+number, "Este campo es obligatorio.");
		return false;
	}
	if (string.length > 80) {
		fillError("#wrong-passenger-surname-"+number, "El apellido supera el límite de 80 caracteres.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-passenger-surname"+number, "Contiene caracteres inválidos.");
		return false;
	}
	return true;
}

function validatePassengerIdNumber(id_number, id_type, number) {
	if (id_number.length == 0) {
		fillError("#wrong-passenger-id-number-"+number, "Este campo es obligatorio.");
		return false;
	}
	if (!checkSpecialCharacters(id_number)) {
		fillError("#wrong-passenger-id-number-"+number, "Contiene caracteres inválidos.");
		return false;
	}
	if (id_type == 1) {
		if (id_number.length != 8 || isNaN(new Number(id_number))) {
			fillError("#wrong-passenger-id-number-"+number, "El número de DNI debe ser de 8 números.");
			return false;
		}
	}
	else if (id_type == 2) {
		if (id_number.length != 9) {
			fillError("#wrong-passenger-id-number-"+number, "El número de Pasaporte es incorrecto.");
			return false;
		}
	}
	return true;
}

function validatePassengerBirthDate(string, number) {
	var cont = true;
	if (string.length == 0){
		cont = false;
	}

	var dateParts = string.split("/");

	if (dateParts.length == 3)
	{
		var my_date = dateParts[1]+'/'+dateParts[0]+'/'+dateParts[2];
		var timestamp = Date.parse(my_date);
		if (isNaN(timestamp)){
			fillError("#wrong-passenger-birth-date-"+number, "La fecha de nacimiento debe estar en fórmato dd/mm/yyyy (día/mes/año).");
			return false;
		}
		return true;
	}

		fillError("#wrong-passenger-birth-date-"+number, "La fecha de nacimiento debe estar en fórmato dd/mm/yyyy (día/mes/año).");
		return false;
}

/* Validate card info functions */
function validateName(string) {
	if (string.length == 0) {
		fillError("#wrong-owner-name", "Este campo es obligatorio.");
		return false;
	}
	if (string.length > 80) {
		fillError("#wrong-owner-name", "El nombre supera el límite de 80 caracteres.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-owner-name", "Contiene caracteres inválidos.");
		return false;
	}
	return true;
}

function validateSurname(string) {
	if (string.length == 0) {
		fillError("#wrong-owner-surname", "Este campo es obligatorio.");
		return false;
	}
	if (string.length > 80) {
		fillError("#wrong-owner-surname", "El apellido supera el límite de 80 caracteres.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-owner-surname", "Contiene caracteres inválidos.");
		return false;
	}
	return true;
}

function validateCreditCard(string) {
	if (string.length == 0) {
		fillError("#wrong-card-number", "Este campo es obligatorio.");
		return false;
	}
	if (string.length < 13) {
		fillError("#wrong-card-number", "Número inválido.");
		return false;
	}
	var isValid = true;
	var first = string.charAt(0);
	var second = string.charAt(1);
	if (first == '3') {
		if ((second == '4' || second == '7') && string.length != 15) {
			isValid = false;
		}
		else if (second == '6' && string.length != 14) {
			isValid = false;
		}
	}
	else if (first == '5') {
		if ((second == '1' || second == '2' || second == '3') && string.length != 16) {
			isValid = false;
		}
	}
	else if (first == '4' && string.length != 13 && string.length != 16) {
		isValid = false;
	}
	if (!isValid) {
		fillError("#wrong-card-number", "Número inválido.");
	}
	return isValid;
}

function validateExpDate(string) {
	if (string.length == 0) {
		fillError("#wrong-card-exp-date", "Este campo es obligatorio.");
		return false;
	}
	if (string.length != 4 || isNaN(new Number(string))) {
		fillError("#wrong-card-exp-date", "Fecha inválida, respete el formato MMYY.");
		return false;
	}
	var month = parseInt(string.substring(0,2));
	var year = parseInt(string.substring(2,4)) + 2000;
	if (month > 12) {
		fillError("#wrong-card-exp-date", "Fecha inválida, respete el formato MMYY.");
		return false;
	}
	if (year<2016){
		fillError("#wrong-card-exp-date", "Fecha inválida, la tarjeta ya expiró.");
		return false;
	}
	return true;
}

function validateSecCode(string) {
	if (string.length == 0) {
		fillError("#wrong-card-code", "Este campo es obligatorio.");
		return false;
	}
	if (isNaN(new Number(string))) {
		fillError("#wrong-card-code", "Código inválido.");
		return false;
	}
	return true;
}

function validateCity(string) {
	if (string.length == 0) {
		fillError("#wrong-city", "Este campo es obligatorio.");
		return false;
	}
	var resp = true;
	var cities_list = getCitiesFromAPI(string);
	resp = $.when(cities_list).done(function(my_response){
		var cities_names = getCitiesNames(my_response.cities);
		if (cities_names.length == 0 || cities_names >= 2 || !(string === cities_names[0])) {
			fillError("#wrong-city", "La ciudad solicitada no existe.");
			return false;
		}
		city_id = decodeURI(my_response.cities[0].id);
		sessionStorage.setItem("billing_city_id",JSON.stringify(city_id));
		return true;
	} );
	return resp;
}

function validateState(string) {
	if (string.length == 0) {
		fillError("#wrong-state", "Este campo es obligatorio.");
		return false;
	}
	if (!checkSpecialCharacters(string) || hasNumber(string)) {
		fillError("#wrong-state", "Estado o Provincia inválido/a.");
		return false;
	}
	if (string.length > 80) {
		fillError("#wrong-state", "La longitud máxima es de 80 caracteres.");
		return false;
	}
	return true;
}

function validateZip(string) {
	if (string.length == 0) {
		fillError("#wrong-zip-code", "Este campo es obligatorio.");
		return false;
	}
	if (!checkSpecialCharacters(string) || isNaN(new Number(string))) {
		fillError("#wrong-zip-code", "Debe contener dígitos unicamente.");
		return false;
	}
	if (string.length > 10) {
		fillError("#wrong-zip-code", "La longitud máxima es de 10 dígitos.");
		return false;
	}
	return true;
}

function validateStreet(string) {
	if (string.length == 0) {
		fillError("#wrong-street", "Este campo es obligatorio.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-street", "Ciudad inválida.");
		return false;
	}
	if (string.length > 80) {
		fillError("#wrong-street", "La longitud máxima es de 80 caracteres.");
		return false;
	}
	return true;
}

function validateDoorNumber(string) {
	if (string.length == 0) {
		fillError("#wrong-door-number", "Este campo es obligatorio.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-door-number", "Solo se permiten caracteres alfanuméricos.");
		return false;
	}
	if (string.length > 6) {
		fillError("#wrong-door-number", "La longitud máxima es de 6 caracteres.");
		return false;
	}
	return true;
}

function validateFloor(string) {
	if (string.length > 3) {
		fillError("#wrong-floor", "La longitud máxima es de 3 dígitos.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-floor", "Solo se permiten caracteres alfanuméricos.");
		return false;
	}
	return true;
}

function validateApartment(string) {
	if ( string.length > 2) {
		fillError("#wrong-apartment", "La longitud máxima es de 2 caracteres.");
		return false;
	}
	if (!checkSpecialCharacters(string)) {
		fillError("#wrong-apartment", "Solo se permiten caracteres alfanuméricos.");
		return false;
	}
	return true;
}

function validateEmail(string) {
	if (string.length == 0) {
		fillError("#wrong-email", "Este campo es obligatorio.");
		return false;
	}
	if (string.length > 128) {
		fillError("#wrong-email", "La longitud máxima es de 128 caracteres.");
		return false;
	}
    var regExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regExp.test(string);
}

function validatePhones(phone_list) {
	var resp = false;
	if (phone_list.length == 0) {
		fillError("#wrong-phone", "Ocurrió un error, intente de nuevo mas tarde.");
		return false;
	}
	for (i = 0; i < phone_list.length; i++) {
		if (phone_list[i].length > 25) {
			fillError("#wrong-phone", "La longitud máxima es de 25 caracteres.");
			return false;
		}
		if (phone_list[i].length != 0 ){
			resp = true;
		}
	}
	if (!resp) {
		fillError("#wrong-phone", "Debe ingresar al menos 1 número de teléfono.");
	}
	return resp;
}

function saveTextInfo(object){
  localStorage.setItem("infoFormState",JSON.stringify(object));
}

function loadTextInfo(load_all){
  var personal_data = JSON.parse(localStorage.getItem("infoFormState"));
  if (personal_data == undefined){
    return;
  }
	if (load_all){
		for (i = 0; i < personal_data.passenger_names.length; i++) {
			document.forms["submitData"]["passenger-name-text-input-" + (i+1)].value = personal_data.passenger_names[i];
			document.forms["submitData"]["passenger-surname-text-input-" + (i+1)].value = personal_data.passenger_surnames[i];
			document.forms["submitData"]["passenger-id-type-option-input-" + (i+1)].value = personal_data.passenger_id_types[i];
			document.forms["submitData"]["passenger-id-number-text-input-" + (i+1)].value = personal_data.passenger_id_numbers[i];
			document.forms["submitData"]["passenger-birth-date-text-input-" + (i+1)].value = personal_data.passenger_birth_dates[i];
		}
		for (i = 0; i < personal_data.phone_list.length; i++) {
			document.forms["submitData"]["phone-number-" + i].value = personal_data.phone_list[i];
		}
	}else{
		for (i = 0; i < personal_data.phone_list.length; i++) {
			if (i != 0){
				$("#add-phone").before("<div class=\"form-group row\"><label for=\"phone-number-" + i + "\" class=\"col-xs-3 control-label\">Teléfono:</label><div class=\"col-xs-4\"><input class=\"form-control\" id=\"phone-number-" + i + "\"></div></div>");
				$("#add-phone").attr("data-value", (i + 1).toString());
			}
			document.forms["submitData"]["phone-number-" + i].value = personal_data.phone_list[i];
		}
	}

	document.forms["submitData"]["card-owner-name-text-input"].value = personal_data.owner_name;
	document.forms["submitData"]["card-owner-surname-text-input"].value = 	personal_data.owner_surname;
	document.forms["submitData"]["card-number-text-input"].value = personal_data.card_number;
	document.forms["submitData"]["card-expiration-text-input"].value = personal_data.exp_date;
	document.forms["submitData"]["card-security-code-text-input"].value = personal_data.sec_code;

	document.forms["submitData"]["country-option-input"].value = personal_data.country;
	document.forms["submitData"]["state-text-input"].value = personal_data.state;
	document.forms["submitData"]["city-text-input"].value = personal_data.city;
	document.forms["submitData"]["zip-code-text-input"].value = 	personal_data.zip_code;
	document.forms["submitData"]["street-text-input"].value = personal_data.street;
	document.forms["submitData"]["door-number-text-input"].value = personal_data.door_number;
	document.forms["submitData"]["floor-text-input"].value = personal_data.floor;
	document.forms["submitData"]["apartment-text-input"].value = personal_data.apartment;

	document.forms["submitData"]["contact-email-text-input"].value = personal_data.email;



}

var creditCardValidation = function(object){
	return $.ajax({
		url: "http://hci.it.itba.edu.ar/v1/api/booking.groovy?method=validatecreditcard",
		data: {
			number: object.number,
			exp_date: object.exp_date,
			sec_code: object.sec_code
		},
		dataType: "json",
	});
}
