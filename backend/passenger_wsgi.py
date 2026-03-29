import imp
import os
import sys


sys.path.insert(0, os.path.dirname(__file__))


from bp_backend.wsgi import application
