from rest_framework.pagination import PageNumberPagination, LimitOffsetPagination
from rest_framework.response import Response
from collections import OrderedDict


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for most API endpoints.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page_size', self.page_size),
            ('results', data)
        ]))


class CalendarPagination(PageNumberPagination):
    """
    Pagination for calendar views - larger page size for month/week views.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class MobilePagination(LimitOffsetPagination):
    """
    Offset-based pagination for mobile apps that prefer limit/offset.
    """
    default_limit = 20
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = 100

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('limit', self.limit),
            ('offset', self.offset),
            ('results', data)
        ]))


class SmallResultsSetPagination(PageNumberPagination):
    """
    Smaller pagination for dashboard/summary views.
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class NoPagination:
    """
    Disable pagination for endpoints that should return all results.
    """
    def paginate_queryset(self, queryset, request, view=None):
        return None

    def get_paginated_response(self, data):
        return Response(data)