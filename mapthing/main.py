#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#


import os
import wsgiref.handlers
import logging

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.api.urlfetch import fetch

LOCALHOST_KEY = 'ABQIAAAAwvFhEUtSIa3VRWVU970fZRQXq7bWTC04Ff1KKaIsErBhwE7B5xSeyI_RzYuuCer6UmCT_rrEo49_dw'
APPSPOT_KEY = 'ABQIAAAAwvFhEUtSIa3VRWVU970fZRRjmb6hDkNmtDi52ZWdEps4nk6ntxSujqTwIyJhN9uIRZN0fnCOXQDG5Q'

if os.environ['SERVER_SOFTWARE'].startswith('Dev'):
    GOOGLE_KEY = LOCALHOST_KEY
else:
    GOOGLE_KEY = APPSPOT_KEY

PROXIES = {
        'alt' :
          'http://gisdata.usgs.gov/xmlwebservices2/elevation_service.asmx/getElevation?X_Value=%(lng)s&Y_Value=%(lat)s&Elevation_Units=METERS&Source_Layer=-1&Elevation_Only=true',
        }

class MainHandler(webapp.RequestHandler):

  def get(self):
      path = os.path.join(os.path.dirname(__file__), 'templates', 'index.html')
      template_values = {
              'key': GOOGLE_KEY
              }
      self.response.out.write(template.render(path, template_values))

class AltHandler(webapp.RequestHandler):

  def get(self):
      path = os.path.join(os.path.dirname(__file__), 'templates', 'alt.html')
      template_values = {
              'key': GOOGLE_KEY
              }
      self.response.out.write(template.render(path, template_values))

class ProxyHandler(webapp.RequestHandler):

    def get(self):
        url = PROXIES[self.request.get('site')]
        args = self.request.arguments()
        logging.info('args %s' % args)
        args.remove('site')
        queries = {}
        for argument in args:
            logging.info('getting %s' % argument)
            value = self.request.get(argument, '')
            logging.info('got %s' % value)
            queries[argument] = value
        logging.info(queries)
        logging.info(url)
        url = url % queries
        data = fetch(url) 
        self.response.out.write(data.content)


def main():
  application = webapp.WSGIApplication([('/', MainHandler),
      ('/alt', AltHandler),
      ('/proxy', ProxyHandler)
      ], debug=True)
  wsgiref.handlers.CGIHandler().run(application)


if __name__ == '__main__':
  main()
