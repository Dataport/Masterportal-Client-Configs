# Masterportal-Klientenkonfigurationsgenerator
Um Masterportale entweder angepasst für viele Kunden oder angepasst über eine Authentifizierung zu betreiben, ist eine Serverkomponente notwendig, welche die Portalkonfiguration generiert.

Der Masterportal-Klientenkonfigurationsgenerator (`masterportal-clientconfigs`) übernimmt diese Aufgabe im Masterportal-Stil;
das heißt: möglichst viele Aspekte der Portalgenerierung sind konfigurierbar.

## Setup lokale Umgebung
Zum Starten der App müssen folgende Schritte durchgeführt werden

.env Datei mit folgendem Inhalt anlegen:

```
	KEYCLOAK_ADDRESS="[URL-Keycloak]"
	VARIANT_ONLY=0
```

Wenn ein Tracking der Portalaufrufe mithilfe einer Monitoring Software erfolgen soll, können folgende Parameter in der .env Datei ergänzt werden:

```
	TRACKING_API_URL="[API-URL of Monitoring Software]"
	TRACKING_API_KEY_NAME="[HTTP-Headers name for API Key]"
	TRACKING_API_KEY="[MONITORING_API_KEY]"
	TRACKING_TRANSFER_INTERVAL=3600000
	TRACKING_ENVIRONMENT="dev"
```

| Name                                 | Beschreibung                                                 				| Wert                                                              |
| ------------------------------------ | --------------------------------------------------------------------------	| ----------------------------------------------------------------- |
| `KEYCLOAK_ADDRESS`                   | URL des Keycloaks										      				| `"http://[domain]/realms/local"` 									|
| `VARIANT_ONLY`   		               | Wenn auf 1 gesetzt, dann werden die Portale unter der rootURL erreichbar.	| `development`                                          			|
| `TRACKING_API_URL`                   | URL für Monitoring Software  	  | `"https://api.datadoghq.eu/api/v2/series"`  |
| `TRACKING_API_KEY_NAME`	   		           | Name des http-headers für den API Key 	  | `"DD-API-KEY"` |
| `TRACKING_API_KEY`                            | API Key für Monitoring API | `"[MONITORING_API_KEY]"`     |
| `TRACKING_TRANSFER_INTERVAL`			| Interval, in dem die Daten an die API geschickt werden. Wenn nicht angegeben, wird es auf `3600000` gesetzt	| `3600000` |
| `TRACKING_ENVIRONMENT` | Variable um zu Tracken, aus welcher Umgebung die Daten an die API gesendet wurden. Wird als 'tag' mit an die API geschickt. | `dev` |


Bibliotheken installieren:
```bash
	npm install
```

App Starten:
```bash
	npm start
```

## Setup als Docker-Container
In der Datei docker-compose.yaml muss in der Environment-Variable KEYCLOAK_ADDRESS ein Keycloak angebunden werden.

### Bau des Docker-Images
Das Docker-Image kann mit folgendem Kommando gebaut werden:
```bash
docker-compose build
```

### Ausführen des Docker-Images
Das Docker-Image kann mit folgendem Kommando gestartet werden:
```bash
docker-compose up -d
```

Soll das Docker-Image in eine andere `docker-compose.yaml` oder ein Helm-Chart eingebaut werden, ist darauf zu achten, dass als Volumes die Ordner `/masterportal-clientconfigs/portal` und `/masterportal-clientconfigs/resources` eingebunden werden.

Die vorgegebene Konfiguration ist in den Ordnern `portal` und resources abgelegt und wird mit der mitgelieferten `docker-compose.yaml` automatisch eingebunden.

## Varianten
Es können für ein Portal über die URL verschiedene Varianten angezeigt werden.
Die Variante wird als zusätzliche Verzeichniskomponente hinter dem Portalnamen angefügt: `/portal/variante`.
Die Variante kann außerdem mit Bindestrichen in Variantenteile geteilt werden: `/portal/variante-spezial`.

## Klientenkonfiguration
Die Konfigurationsdatei des Masterportal-Klientenkonfigurationsgenerators nennen wir Klientenkonfiguration (clients.json).
Diese Datei enthält alle Parameter, die wir später in unsere Vorlagen (beispielsweise config.json) je nach Aufrufeigenschaften (beispielsweise URL-Variante oder Keycloak-Rolle) einbauen wollen.

Auf der obersten Objektebene der clients.json existieren folgende Schlüssel:

 - `variantLabels`:
   Hier kann eine Liste an Variantenteilen geführt werden.
   Die Länge der Liste bestimmt, wie viele Variantenteile maximal zugelassen werden.
   Der Eintrag in der Liste (Position ist relevant) bestimmt, mit welchem Label wir den entsprechenden Variantenteil im Folgenden referenzieren.
 - `via`:
   Dieser Schlüssel ermöglicht es, Parameter in Abhängigkeit von Aufrufeigenschaften aufzulösen.
   Unterhalb des `via`-Schlüssels sind die Aufrufeigenschaften, nach denen aufgelöst werden soll, als Schlüssel zu nutzen.
   Für jeden Eigenschaftsschlüssel sind darunter die möglichen Ausprägungen als Schlüssel zu nutzen.
   Innerhalb dieser Objekte können dann Parameter definiert werden.

Parameter können sowohl auf der Wurzelebene als auch in einer Ausprägung in einem `via`-Block gesetzt werden.
`via`-Blöcke können bei Bedarf außerdem verschachtelt werden, das heißt, innerhalb einer Ausprägung kann mit `via` zusätzlich nach einer anderen Eigenschaft differenziert werden.
Als Datentypen für Parameter kommen alle JSON-Datentypen in Betracht (auch verschachtelte Datenstrukturen).

Die möglichen Aufrufeigenschaften sind:

 - `variant`: Die (vollständige) Variante.
 - *Eintrag aus `variantLabels`*: Der entsprechende Variantenteil.
 - `role`: Die Keycloak-Rolle im Feld `client`.
 - `roles`: Die Liste der Keycloak-Rollen im Feld `clients`.

**Beispiel clients.json:**
```json
{
	"variantLabels": [
		"location",
		"version"
	],
	"via": {
		"location": {
			"kiel": {
				"name": "Kiel",
				"start": [ 574950, 6021211 ],
				"elektro": "wms"
			},
			"xanten": {
				"name": "Xanten",
				"start": [ 323866, 5726545 ],
				"elektro": "n/v"
			}
		},
		"version": {
			"grau": {
				"backgroundMap": "wms-basemap-gray"
			},
			"farbe": {
				"backgroundMap": "wms-basemap-color"
			}
		}
	},
	"title": "Masterportal-Klientenkonfigurationsgenerator"
}
```

**Beispiel-URL:** https://HOSTNAME/portal/xanten-farbe/

## Vorlagen-Syntax
### Textvorlagen
HTML- und JavaScript-Dateien (sowie sonstige Textdateien) können als Vorlagen dienen.
In diesen Dateien können String-Parameter eingefügt werden (sowie Zahlen und Booleans, welche ebenfalls als String repräsentiert werden können).
Eine Einbindung von komplexeren Datenstrukturen (Arrays, Objekte) in Textvorlagen wird nicht unterstützt.

Um einen Parameter in einer Vorlage einzubinden, wird die Syntax `{{ TEMPLATE }}` genutzt.
`TEMPLATE` kann hierbei eine der folgenden Optionen sein:

 - `true` (oder `otherwise`): Boolean-Wert true
 - `false`: Boolean-Wert false
 - `role`: String-Wert, Rolle aus dem JWT
 - `roles`: Array-Wert, Rollen aus dem JWT
 - `variant`: String-Wert, vollständige Variante
 - `opt(VARIANTPART)`: String-Wert, Variantenteil `VARIANTPART`
 - `env(VARIABLE)`: String-Wert, Umgebungsvariable `VARIABLE`
 - `'Zeichenketten'`: String-Wert, enthaltene Zeichenkette;
   dies ist insbesondere nützlich für Vergleiche oder zum Escaping von `{{ ... }}`
 - `1234`: Number-Wert, die Zahl 1234
 - `not (TEMPLATE)`: Boolean-Wert, löst zunächst `TEMPLATE` auf und negiert den Wert dann logisch
 - `eq (LEFT) (RIGHT)`: Boolean-Wert, true g.d.w. `LEFT` und `RIGHT` zum gleichen Wert auflösen
 - `neq (LEFT) (RIGHT)`: Boolean-Wert, false g.d.w. `LEFT` und `RIGHT` zum gleichen Wert auflösen
 - `and (LEFT) (RIGHT)`: Boolean-Wert, true g.d.w. `LEFT` und `RIGHT` zu truthy-Werten auflösen
 - `or (LEFT) (RIGHT)`: Boolean-Wert, true g.d.w. `LEFT` oder `RIGHT` zu truthy-Werten auflösen
 - `elem (ITEM) (LIST)`: Boolean-Wert, true g.d.w. `ITEM` ein Element der Liste `LIST` ist

Außerdem kann mit `alpha.beta[2].gamma` der Parameter eingebunden werden, welcher auf der Wurzelebene der Klientenkonfiguration wie folgt hinterlegt ist:
`{ "alpha": { "beta": [ 0, 1, { "gamma": "PARAMETER" } ] } }`

Um aufrufeigenschaftenabhängige Parameter einzubinden, muss dem Pfad ein `via(PROPERTY)` vorangestellt werden.
`PROPERTY` kann hierbei entweder `variant`, `role` oder ein Schlüssel für einen Variantenteil sein.

### JSON-Vorlagen
In JSON-Vorlagen werden die Werte im JSON analog zur Beschreibung bei den Textvorlagen aufgelöst.
Besteht ein Wert-String jedoch vollständig nur aus genau einer Vorlage (`"{{ TEMPLATE }}"`), werden die Werte datentypgetreu ins JSON eingewebt.
In diesem Fall sind dann auch komplexere Datenstrukturen (Arrays, Objekte) möglich.

In Arrays und Objekten werden Einträge, deren Wert ein leeres Objekt ist, gelöscht.
Das ermöglicht ein flexibleres Templating mit der unten beschriebenen Methodik.

Wird in einem Objekt als Schlüssel ein String genutzt, der vollständig aus genau einer Vorlage besteht, wird dieser ausgewertet:

 - Ist der Schlüssel truthy, werden die anderen Schlüssel im Objekt ignoriert.
   Das Objekt wird durch den Wert am entsprechenden Schlüssel ersetzt.
   Sind mehrere Schlüssel truthy, wird der Wert des ersten truthy-Schlüssels genutzt.
 - Ist der Schlüssel falsy, wird der Schlüssel und zugehörige Wert ignoriert.
 - Ist in einem Objekt kein Schlüssel truthy, wird das Objekt (ohne die vorlagenbehafteten Schlüssel) genutzt, also die vorlagenfreien Schlüssel.

**Beispiel config.json:**
```json
{
	"Portalconfig": {
		"portalTitle": {
			"title": "{{ title }} - Stadt {{ via(location) name }}"
		},
		"mapView": {
			"startCenter": "{{ via(location) start }}",
		}
	},
	"Themenconfig": {
		"Hintergrundkarten": {
			"Layer": [
				{
					"id": "{{ via(version) backgroundMap }}"
				}
			]
		},
		"Fachdaten": {
			"Layer": [
				{
					"{{ eq (via(location) elektro) ('wms') }}": {
						"id": "wms-ladesaeulen",
						"name": "Elektroladesäulen"
					},
				}
			]
		}
	}
}
```

Mit der obigen clients.json ergeben sich daraus die folgenden resultierenden config.json-Dateien.

**Resultierende config.json für /portal/kiel-grau/:**
```json
{
	"Portalconfig": {
		"portalTitle": {
			"title": "Masterportal-Klientenkonfigurationsgenerator - Stadt Kiel"
		},
		"mapView": {
			"startCenter": [ 574950, 6021211 ],
		}
	},
	"Themenconfig": {
		"Hintergrundkarten": {
			"Layer": [
				{
					"id": "wms-basemap-gray"
				}
			]
		}
		"Fachdaten": {
			"Layer": [
				{
					"id": "wms-ladesaeulen",
					"name": "Elektroladesäulen"
				}
			]
		}
	}
}
```

**Resultierende config.json für /portal/xanten-farbe/:**
```json
{
	"Portalconfig": {
		"portalTitle": {
			"title": "Masterportal-Klientenkonfigurationsgenerator - Stadt Xanten"
		},
		"mapView": {
			"startCenter": [ 323866, 5726545 ],
		}
	},
	"Themenconfig": {
		"Hintergrundkarten": {
			"Layer": [
				{
					"id": "wms-basemap-color"
				}
			]
		},
		"Fachdaten": {
			"Layer": [
			]
		}
	}
}
```

## Vorlagendateien
Im Ordner `./portal` können (wie aus dem klassischen Masterportal bekannt) Portale in Unterordnern erstellt werden.
Die Portalkonfiguration kann jedoch generisch geschrieben werden, indem Parameter dynamisch eingefügt werden.

Die Ressourcendateien (`services-internet.json`, `rest-services-internet.json` und `style_v3.json`) sowie ggf. zusätzliche Ressourcen (beispielsweise Bilder) werden aktuell unverändert an den Client ausgegeben.
