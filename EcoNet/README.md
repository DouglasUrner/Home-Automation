Rheem EcoNet
============

[API](http://io.myrheem.com) - the published API doesn't seem to be able to
do what the mobile device API is capable of (e.g., the energy usage stats).

[Burp Suite Scanner](https://portswigger.net/burp)

The app API is "public" - you don't have to get a key from Rheem, but is is not
the same as the published API linked above. The known methods are:

* GET /equipment/{id} - returns partial status of the water heater, the state of
the electric heating elements and the compressor temperatures are missing. The data may not be updated in real
time. The readings are often identical for clusters of four minutes.

* GET /equipment/{id}/usage - returns the unit's energy consumption data.