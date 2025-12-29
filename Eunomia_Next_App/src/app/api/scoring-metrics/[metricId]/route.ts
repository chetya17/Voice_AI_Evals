import { NextRequest, NextResponse } from 'next/server';
import { ScoringMetricService } from '@/lib/mongodbService';

// GET /api/scoring-metrics/[metricId] - Get a specific scoring metric
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ metricId: string }> }
) {
  try {
    const { metricId } = await params;

    if (!metricId) {
      return NextResponse.json(
        { error: 'Metric ID is required' },
        { status: 400 }
      );
    }

    const metric = await ScoringMetricService.getScoringMetricById(metricId);
    
    if (!metric) {
      return NextResponse.json(
        { error: 'Metric not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: metric 
    });
  } catch (error) {
    console.error('Error fetching scoring metric:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoring metric' },
      { status: 500 }
    );
  }
}

// PUT /api/scoring-metrics/[metricId] - Update a scoring metric
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ metricId: string }> }
) {
  try {
    const { metricId } = await params;
    const body = await request.json();

    if (!metricId) {
      return NextResponse.json(
        { error: 'Metric ID is required' },
        { status: 400 }
      );
    }

    const updatedMetric = await ScoringMetricService.updateScoringMetric(metricId, body);
    
    if (!updatedMetric) {
      return NextResponse.json(
        { error: 'Metric not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedMetric 
    });
  } catch (error) {
    console.error('Error updating scoring metric:', error);
    return NextResponse.json(
      { error: 'Failed to update scoring metric' },
      { status: 500 }
    );
  }
}

// DELETE /api/scoring-metrics/[metricId] - Delete a scoring metric
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ metricId: string }> }
) {
  try {
    const { metricId } = await params;

    if (!metricId) {
      return NextResponse.json(
        { error: 'Metric ID is required' },
        { status: 400 }
      );
    }

    const deleted = await ScoringMetricService.deleteScoringMetric(metricId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Metric not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Metric deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting scoring metric:', error);
    return NextResponse.json(
      { error: 'Failed to delete scoring metric' },
      { status: 500 }
    );
  }
}
